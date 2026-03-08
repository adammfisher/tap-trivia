import Foundation
import AVFoundation
import MediaPlayer

// TapTrivia is a commercial digital signage app for bars and restaurants.
//
// Anti-dimming strategy (6 layers):
// 1. AVPlayer + AVPlayerLooper with AVPlayerLayer — tvOS suppresses dimming
//    for apps with visible video layers (same path as Netflix/YouTube)
// 2. MPNowPlayingInfoCenter — registers as active media session
// 3. MPRemoteCommandCenter — required for Now Playing to register
// 4. isIdleTimerDisabled toggle every 15s — resets system inactivity counter
// 5. Focus engine updates every 15s — counted as user activity
// 6. Perpetual UIView animation — active Core Animation suppresses dimmer

@objc(SilentAudioPlayer)
class SilentAudioPlayerModule: NSObject {

  private var player: AVQueuePlayer?
  private var looper: AVPlayerLooper?
  private var playerLayer: AVPlayerLayer?
  private var idleResetTimer: Timer?
  private var keepAliveView: UIView?
  private var tickCount: Int = 0

  @objc
  func startSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.configureAndPlay()
      self?.startKeepAliveAnimation()
      self?.startIdleReset()
      self?.observeAppLifecycle()
    }
  }

  @objc
  func stopSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.idleResetTimer?.invalidate()
      self?.idleResetTimer = nil
      self?.player?.pause()
      self?.playerLayer?.removeFromSuperlayer()
      self?.playerLayer = nil
      self?.player = nil
      self?.looper = nil
      self?.keepAliveView?.layer.removeAllAnimations()
      self?.keepAliveView?.removeFromSuperview()
      self?.keepAliveView = nil
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

      // Attach an AVPlayerLayer to a visible view — this is the critical
      // signal that tells tvOS "video content is being displayed". Without
      // a player layer in the view hierarchy, tvOS treats the AVPlayer as
      // background audio and will still engage the screen dimmer.
      attachPlayerLayer(queuePlayer)

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

  /// Attach an AVPlayerLayer to the key window. tvOS uses the presence of
  /// an AVPlayerLayer in the view hierarchy as the primary signal that
  /// video content is being played — this is what prevents Netflix/YouTube
  /// from triggering the screensaver. The layer is 1x1 pixel and fully
  /// transparent so it's invisible to the user.
  private func attachPlayerLayer(_ player: AVQueuePlayer) {
    guard let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first?.windows.first else {
      NSLog("[SilentAudioPlayer] No key window — skipping AVPlayerLayer attach")
      return
    }

    let layer = AVPlayerLayer(player: player)
    layer.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
    layer.opacity = 0.0
    window.layer.addSublayer(layer)
    playerLayer = layer
    NSLog("[SilentAudioPlayer] AVPlayerLayer attached to window")
  }

  /// Attach an invisible 1x1 UIView to the key window and run a perpetual
  /// UIKit animation on it. tvOS treats apps with active Core Animation
  /// commits as "in use" and will not engage the screen dimmer or screensaver.
  private func startKeepAliveAnimation() {
    keepAliveView?.layer.removeAllAnimations()
    keepAliveView?.removeFromSuperview()

    guard let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .first?.windows.first else {
      NSLog("[SilentAudioPlayer] No key window — skipping keep-alive animation")
      return
    }

    let view = UIView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
    view.isUserInteractionEnabled = false
    view.alpha = 0.0
    window.addSubview(view)
    keepAliveView = view

    startPerpetualAnimation(on: view)
    NSLog("[SilentAudioPlayer] Keep-alive UIView animation started")
  }

  private func startPerpetualAnimation(on view: UIView) {
    UIView.animate(
      withDuration: 2.0,
      delay: 0,
      options: [.repeat, .autoreverse, .allowUserInteraction],
      animations: {
        view.alpha = 0.001
      },
      completion: { [weak self, weak view] finished in
        if !finished, let view = view, view.superview != nil {
          view.alpha = 0.0
          self?.startPerpetualAnimation(on: view)
        }
      }
    )
  }

  /// Every 15s: toggle idle timer, trigger focus update, advance Now Playing,
  /// verify AVPlayer + animation are running. Logs every tick for diagnostics.
  /// Timer is added to RunLoop.common so it fires even during UI tracking.
  private func startIdleReset() {
    idleResetTimer?.invalidate()
    tickCount = 0
    UIApplication.shared.isIdleTimerDisabled = true
    let timer = Timer(timeInterval: 15, repeats: true) { [weak self] _ in
      guard let self = self else { return }
      self.tickCount += 1

      // 1. TOGGLE idle timer off then back on — resets inactivity counter
      UIApplication.shared.isIdleTimerDisabled = false
      UIApplication.shared.isIdleTimerDisabled = true

      // 2. Trigger focus engine update — counted as user activity
      if let rootVC = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .first?.windows.first?.rootViewController {
        rootVC.setNeedsFocusUpdate()
        rootVC.updateFocusIfNeeded()
      }

      // 3. Keep Now Playing elapsed time advancing
      if var info = MPNowPlayingInfoCenter.default().nowPlayingInfo {
        let elapsed = (info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double) ?? 0
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed + 15.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      }

      // 4. Ensure AVPlayer is still playing
      if self.player?.rate == 0 {
        self.player?.play()
        NSLog("[SilentAudioPlayer] tick #\(self.tickCount) — restarted paused AVPlayer")
      }

      // 5. Ensure AVPlayerLayer is still attached
      if self.playerLayer?.superlayer == nil, let p = self.player {
        self.attachPlayerLayer(p)
        NSLog("[SilentAudioPlayer] tick #\(self.tickCount) — reattached AVPlayerLayer")
      }

      // 6. Ensure keep-alive animation is still running
      if let view = self.keepAliveView, view.layer.animationKeys()?.isEmpty ?? true {
        view.alpha = 0.0
        self.startPerpetualAnimation(on: view)
        NSLog("[SilentAudioPlayer] tick #\(self.tickCount) — restarted keep-alive animation")
      }

      // Log every 4th tick (once per minute) to confirm timer is alive
      if self.tickCount % 4 == 0 {
        let rate = self.player?.rate ?? -1
        let hasLayer = self.playerLayer?.superlayer != nil
        let hasAnim = !(self.keepAliveView?.layer.animationKeys()?.isEmpty ?? true)
        NSLog("[SilentAudioPlayer] tick #\(self.tickCount) — rate=\(rate) layer=\(hasLayer) anim=\(hasAnim)")
      }
    }
    // Add to .common mode so timer fires even during UI tracking
    RunLoop.main.add(timer, forMode: .common)
    idleResetTimer = timer
    NSLog("[SilentAudioPlayer] 15s idle reset timer started on .common RunLoop mode")
  }

  private func observeAppLifecycle() {
    NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      UIApplication.shared.isIdleTimerDisabled = true

      // Restart keep-alive animation after returning from background
      if let view = self?.keepAliveView, view.layer.animationKeys()?.isEmpty ?? true {
        view.alpha = 0.0
        self?.startPerpetualAnimation(on: view)
        NSLog("[SilentAudioPlayer] didBecomeActive — restarted keep-alive animation")
      }

      // Reattach player layer if needed
      if self?.playerLayer?.superlayer == nil, let p = self?.player {
        self?.attachPlayerLayer(p)
        NSLog("[SilentAudioPlayer] didBecomeActive — reattached AVPlayerLayer")
      }

      NSLog("[SilentAudioPlayer] didBecomeActive — isIdleTimerDisabled = true")
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
