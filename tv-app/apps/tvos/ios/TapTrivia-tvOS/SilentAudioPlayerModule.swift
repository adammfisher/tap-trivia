import Foundation
import AVFoundation
import MediaPlayer

// TapTrivia is a commercial digital signage app for bars and restaurants.
// Uses AVPlayer + AVPlayerLooper (not AVAudioPlayer) because tvOS only
// suppresses screen dimming for AVPlayer-based media playback — the same
// path used by Netflix, YouTube, etc. Also publishes Now Playing info so
// tvOS treats the app as an active media session.

@objc(SilentAudioPlayer)
class SilentAudioPlayerModule: NSObject {

  private var player: AVQueuePlayer?
  private var looper: AVPlayerLooper?
  private var idleResetTimer: Timer?

  @objc
  func startSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.configureAndPlay()
      self?.startIdleReset()
    }
  }

  @objc
  func stopSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.idleResetTimer?.invalidate()
      self?.idleResetTimer = nil
      self?.player?.pause()
      self?.player = nil
      self?.looper = nil
      try? AVAudioSession.sharedInstance().setActive(false)
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
  }

  private func configureAndPlay() {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .moviePlayback)
      try session.setActive(true)

      guard let url = Bundle.main.url(forResource: "silence", withExtension: "m4a") else {
        NSLog("[SilentAudioPlayer] silence.m4a not found in bundle")
        return
      }

      // AVPlayer + AVPlayerLooper — tvOS recognizes this as active media
      // playback and suppresses both screen dimming and screensaver
      let asset = AVAsset(url: url)
      let item = AVPlayerItem(asset: asset)
      let queuePlayer = AVQueuePlayer(playerItem: item)
      queuePlayer.volume = 0.0
      looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
      player = queuePlayer
      queuePlayer.play()

      // Publish Now Playing info so tvOS treats us as active media
      var nowPlaying: [String: Any] = [:]
      nowPlaying[MPMediaItemPropertyTitle] = "TapTrivia Live"
      nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
      nowPlaying[MPNowPlayingInfoPropertyElapsedPlaybackTime] = 0.0
      nowPlaying[MPMediaItemPropertyPlaybackDuration] = 86400.0
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlaying

      // Accept remote commands (required for Now Playing to register)
      let commandCenter = MPRemoteCommandCenter.shared()
      commandCenter.playCommand.isEnabled = true
      commandCenter.playCommand.addTarget { _ in .success }
      commandCenter.pauseCommand.isEnabled = true
      commandCenter.pauseCommand.addTarget { _ in .success }

      NSLog("[SilentAudioPlayer] AVPlayer looping playback started")
    } catch {
      NSLog("[SilentAudioPlayer] Error: \(error.localizedDescription)")
    }
  }

  /// Every 30s: toggle idle timer + trigger focus update + update Now Playing
  /// All three act as "user activity" signals to prevent tvOS dimming
  private func startIdleReset() {
    idleResetTimer?.invalidate()
    UIApplication.shared.isIdleTimerDisabled = true
    idleResetTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
      // 1. Toggle idle timer to reset system inactivity counter
      UIApplication.shared.isIdleTimerDisabled = false
      UIApplication.shared.isIdleTimerDisabled = true

      // 2. Trigger focus engine update — tvOS counts this as user activity
      if let rootVC = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .first?.windows.first?.rootViewController {
        rootVC.setNeedsFocusUpdate()
        rootVC.updateFocusIfNeeded()
      }

      // 3. Keep Now Playing elapsed time advancing so media session stays active
      if var info = MPNowPlayingInfoCenter.default().nowPlayingInfo {
        let elapsed = (info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double) ?? 0
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed + 30.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      }

      // 4. Ensure AVPlayer is still playing (recover if system paused it)
      if self?.player?.rate == 0 {
        self?.player?.play()
        NSLog("[SilentAudioPlayer] Restarted paused AVPlayer")
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
