package com.monkeyfist.monkey_fist

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    private data class MusicSession(val id: Int, val track: AudioTrack)
    @Volatile private var music: MusicSession? = null
    private val writer = Executors.newSingleThreadExecutor()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "monkey_fist/music")
            .setMethodCallHandler { call, result ->
                try {
                    val id = call.argument<Int>("id") ?: -1
                    when (call.method) {
                        "start" -> {
                            stopMusic()
                            val minimum = AudioTrack.getMinBufferSize(22050,
                                AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
                            val track = AudioTrack.Builder()
                                .setAudioAttributes(AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_GAME)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                                .setAudioFormat(AudioFormat.Builder().setSampleRate(22050)
                                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
                                .setTransferMode(AudioTrack.MODE_STREAM)
                                .setBufferSizeInBytes(maxOf(minimum * 4, 22050)).build()
                            track.setVolume((call.argument<Double>("volume") ?: .55).toFloat())
                            music = MusicSession(id, track)
                            track.play()
                            result.success(null)
                        }
                        "write" -> {
                            val session = music
                            val pcm = call.argument<ByteArray>("pcm")!!
                            writer.execute {
                                var offset = 0
                                try {
                                    while (session != null && session.id == id && music === session && offset < pcm.size) {
                                        val written = session.track.write(pcm, offset, pcm.size - offset, AudioTrack.WRITE_BLOCKING)
                                        if (written <= 0) break
                                        offset += written
                                    }
                                } catch (_: IllegalStateException) { /* Playback was stopped. */ }
                                runOnUiThread { result.success(offset == pcm.size && music === session) }
                            }
                        }
                        "volume" -> {
                            music?.takeIf { it.id == id }?.track?.setVolume(
                                (call.argument<Double>("volume") ?: 0.0).toFloat())
                            result.success(null)
                        }
                        "stop" -> { stopMusic(id); result.success(null) }
                        else -> result.notImplemented()
                    }
                } catch (error: Exception) {
                    stopMusic()
                    result.error("music", error.message, null)
                }
            }
    }

    private fun stopMusic(id: Int? = null) {
        val previous = music ?: return
        if (id != null && previous.id != id) return
        music = null
        // Unblock any pending write before releasing on the audio worker.
        previous.track.pause()
        previous.track.flush()
        writer.execute { previous.track.release() }
    }

    override fun onPause() {
        stopMusic()
        super.onPause()
    }

    override fun onDestroy() {
        stopMusic()
        writer.shutdown()
        super.onDestroy()
    }
}
