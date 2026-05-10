package com.gcs

import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "GCS"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableImmersiveMode()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    val host = (application as ReactApplication).reactHost
    // Bridgeless: first focus event often arrives before ReactContext exists. Forwarding then
    // always logs ReactNoCrashSoftException; lifecycle + onResume still drive the host. Once the
    // context exists, forward focus normally.
    if (host?.currentReactContext != null) {
      super.onWindowFocusChanged(hasFocus)
    }
    if (hasFocus) {
      window.decorView.post { enableImmersiveMode() }
    }
  }

  /**
   * Hide both the status bar (clock/battery/signal) and the navigation bar
   * for a true full-screen tactical canvas. We use the modern AndroidX
   * `WindowInsetsControllerCompat` API, which is the API-30+ replacement
   * for the deprecated `setSystemUiVisibility` flags. `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`
   * means a user can still pull bars in temporarily with an edge swipe,
   * but they auto-hide again — equivalent to "immersive sticky".
   */
  private fun enableImmersiveMode() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      hide(WindowInsetsCompat.Type.systemBars())
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
  }
}
