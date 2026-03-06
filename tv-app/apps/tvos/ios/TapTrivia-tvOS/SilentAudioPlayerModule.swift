import Foundation
import AVFoundation

// TapTrivia is a commercial digital signage app for bars and restaurants.
// This audio session prevents the tvOS screensaver from activating while
// the app displays live trivia content and promotional signage to patrons.
// The silent audio loop is the standard tvOS approach for kiosk/signage apps
// that need to remain visible continuously during business hours.

@objc(SilentAudioPlayer)
class SilentAudioPlayerModule: NSObject {

  private var audioPlayer: AVAudioPlayer?

  @objc
  func startSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.configureAndPlay()
    }
  }

  @objc
  func stopSilentAudio() {
    DispatchQueue.main.async { [weak self] in
      self?.audioPlayer?.stop()
      try? AVAudioSession.sharedInstance().setActive(false)
    }
  }

  private func configureAndPlay() {
    do {
      // Configure audio session for continuous playback
      // This keeps tvOS from activating the screensaver
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default)
      try session.setActive(true)

      // Load the bundled silent audio file
      guard let url = Bundle.main.url(forResource: "silence", withExtension: "m4a") else {
        NSLog("[SilentAudioPlayer] silence.m4a not found in bundle")
        return
      }

      audioPlayer = try AVAudioPlayer(contentsOf: url)
      audioPlayer?.numberOfLoops = -1  // Loop indefinitely
      audioPlayer?.volume = 0.0
      audioPlayer?.play()

      NSLog("[SilentAudioPlayer] Silent audio playback started")
    } catch {
      NSLog("[SilentAudioPlayer] Error: \(error.localizedDescription)")
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
