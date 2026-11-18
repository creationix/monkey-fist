import AVFoundation
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "MonkeyFistMusic") {
      MusicChannel.register(with: registrar)
    }
  }
}

/// The `monkey_fist/music` channel (MainActivity.kt on Android): plays the
/// synthesized bars, 22.05 kHz mono 16-bit PCM, through AVAudioEngine. A write
/// is answered once the bar before it has played, so one bar plays while the
/// next waits, like AudioTrack's blocking writes.
final class MusicChannel: NSObject, FlutterPlugin {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private let format = AVAudioFormat(
    commonFormat: .pcmFormatFloat32, sampleRate: 22050, channels: 1, interleaved: false)!
  private var session = -1
  private var queued = 0
  private var waiting: FlutterResult?

  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(
      name: "monkey_fist/music", binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(MusicChannel(), channel: channel)
  }

  override init() {
    super.init()
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: format)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    let args = call.arguments as? [String: Any] ?? [:]
    let id = args["id"] as? Int ?? -1
    switch call.method {
    case "start":
      start(id, volume: args["volume"] as? Double ?? 0.55, result: result)
    case "write":
      write(id, pcm: (args["pcm"] as? FlutterStandardTypedData)?.data, result: result)
    case "volume":
      if id == session { player.volume = Float(args["volume"] as? Double ?? 0) }
      result(nil)
    case "stop":
      stop(id)
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func start(_ id: Int, volume: Double, result: FlutterResult) {
    stop(nil)
    do {
      // Follow the sound effects: mix with other audio and respect the silent
      // switch, even when effects are off and have not set the session up.
      let audio = AVAudioSession.sharedInstance()
      if audio.category == .soloAmbient {
        try audio.setCategory(.ambient, options: [.mixWithOthers])
      }
      try engine.start()
      player.volume = Float(volume)
      player.play()
      session = id
      result(nil)
    } catch {
      result(FlutterError(code: "music", message: error.localizedDescription, details: nil))
    }
  }

  private func write(_ id: Int, pcm: Data?, result: @escaping FlutterResult) {
    guard id == session, engine.isRunning, let pcm = pcm, pcm.count >= 2,
      let buffer = AVAudioPCMBuffer(
        pcmFormat: format, frameCapacity: AVAudioFrameCount(pcm.count / 2))
    else {
      result(false)
      return
    }
    let frames = pcm.count / 2
    buffer.frameLength = AVAudioFrameCount(frames)
    let out = buffer.floatChannelData![0]
    pcm.withUnsafeBytes { raw in
      for i in 0..<frames {
        let sample = Int16(littleEndian: raw.loadUnaligned(fromByteOffset: i * 2, as: Int16.self))
        out[i] = Float(sample) / 32768
      }
    }
    queued += 1
    player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
      DispatchQueue.main.async { self?.played(id) }
    }
    if queued < 2 {
      result(true)
    } else {
      waiting = result
    }
  }

  private func played(_ id: Int) {
    guard id == session else { return }
    queued -= 1
    if queued < 2, let result = waiting {
      waiting = nil
      result(true)
    }
  }

  private func stop(_ id: Int?) {
    if let id = id, id != session { return }
    session = -1
    queued = 0
    if let result = waiting {
      waiting = nil
      result(false)
    }
    player.stop()
    engine.stop()
  }
}
