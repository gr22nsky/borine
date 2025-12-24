const { withAndroidManifest, withDangerousMod, withAndroidStyles, withStringsXml, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) return;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyFileIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function ensureReactRoot(buildGradle) {
  // 1. Ensure projectRoot uses environment variable
  const projectRootLine = 'def projectRoot = System.getenv("BORINE_PROJECT_ROOT") ?: rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
  if (!buildGradle.includes('System.getenv("BORINE_PROJECT_ROOT")')) {
    buildGradle = buildGradle.replace(
      /def projectRoot = .*/,
      projectRootLine
    );
  }

  // 2. Ensure extraPackagerArgs includes --entry-file
  if (!buildGradle.includes('extraPackagerArgs = ["--entry-file"')) {
    const entryFileResolution = `    def resolvedEntry = ["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"]
        .execute(null, rootDir)
        .text
        .trim()
    entryFile = file(resolvedEntry)
    extraPackagerArgs = ["--entry-file", resolvedEntry]`;
    
    buildGradle = buildGradle.replace(
      /entryFile = file\(.*resolveAppEntry.*\)\n/,
      `${entryFileResolution}\n`
    );
  }

  if (buildGradle.includes('root = file(projectRoot)')) return buildGradle;
  const reactBlockStart = /react\s*\{\s*\n/;
  if (!reactBlockStart.test(buildGradle)) return buildGradle;
  return buildGradle.replace(reactBlockStart, (match) => `${match}    root = file(projectRoot)\n`);
}

function ensureSplashBranding(projectRoot, appRoot) {
  const brandingSource = path.join(appRoot, 'assets', 'textlogo_malhaejwo.png');
  const brandingTarget = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'drawable-xxxhdpi',
    'splashscreen_branding_base_v2.png'
  );
  
  // Remove old nodpi version if exists
  const oldTargetBase = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable-nodpi', 'splashscreen_branding_base.png');
  if (fs.existsSync(oldTargetBase)) fs.unlinkSync(oldTargetBase);
  
  const oldTargetBranding = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable-nodpi', 'splashscreen_branding.png');
  if (fs.existsSync(oldTargetBranding)) fs.unlinkSync(oldTargetBranding);

  // Remove old xxxhdpi version
  const oldTargetXxx = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable-xxxhdpi', 'splashscreen_branding_base.png');
  if (fs.existsSync(oldTargetXxx)) fs.unlinkSync(oldTargetXxx);

  copyFileIfExists(brandingSource, brandingTarget);

  // Create a wrapper drawable to prevent squashing and cropping
  const brandingWrapperPath = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'drawable',
    'splashscreen_custom_branding.xml'
  );
  const wrapperContent = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:drawable="@drawable/splashscreen_branding_base_v2"
        android:gravity="center"
        android:width="300dp"
        android:height="200dp" />
</layer-list>`;
  writeFileIfChanged(brandingWrapperPath, wrapperContent);
  // Force write to be sure
  fs.writeFileSync(brandingWrapperPath, wrapperContent, 'utf8');

  const v31StylesPath = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'values-v31',
    'styles.xml'
  );

  if (fs.existsSync(v31StylesPath)) {
    console.log(`[with-screen-capture-android] Deleting ${v31StylesPath} to force use of values/styles.xml`);
    fs.unlinkSync(v31StylesPath);
  }
}

function patchAdaptiveIcon(projectRoot) {
  const resDir = path.join(projectRoot, 'app', 'src', 'main', 'res');
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  const files = ['ic_launcher.xml', 'ic_launcher_round.xml'];

  files.forEach((file) => {
    const filePath = path.join(anyDpiDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('<foreground android:drawable="@mipmap/ic_launcher_foreground"/>')) {
        const patchedForeground = `    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground"
               android:insetLeft="18%"
               android:insetRight="18%"
               android:insetTop="18%"
               android:insetBottom="18%" />
    </foreground>`;
        content = content.replace(
          /<foreground android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/,
          patchedForeground
        );
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  });
}

const withAndroidSplashStyles = (config) => {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style || [];
    const splashStyle = styles.find((s) => s.$.name === 'Theme.App.SplashScreen');

    if (splashStyle) {
      // Ensure postSplashScreenTheme is present
      if (!splashStyle.item.find((i) => i.$.name === 'postSplashScreenTheme')) {
        splashStyle.item.push({ _: '@style/AppTheme', $: { name: 'postSplashScreenTheme' } });
      }
      // Add or update branding image
      const brandingItem = splashStyle.item.find((i) => i.$.name === 'android:windowSplashScreenBrandingImage');
      if (brandingItem) {
        brandingItem._ = '@drawable/splashscreen_custom_branding';
      } else {
        splashStyle.item.push({
          _: '@drawable/splashscreen_custom_branding',
          $: { name: 'android:windowSplashScreenBrandingImage' },
        });
      }
    }

    return config;
  });
};

const withFixedStrings = (config) => {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];
    const appName = strings.find((s) => s.$.name === 'app_name');
    if (appName) {
      appName._ = '보리네 말해줘';
    }
    return config;
  });
};

function insertIfMissing(haystack, needle, insertionPointRegex, insertion) {
  if (haystack.includes(needle)) return haystack;
  if (!insertionPointRegex.test(haystack)) return haystack;
  return haystack.replace(insertionPointRegex, (match) => `${match}${insertion}`);
}

function patchMainApplication(mainApplicationPath, packageName) {
  if (!fs.existsSync(mainApplicationPath)) return;
  const current = fs.readFileSync(mainApplicationPath, 'utf8');

  const importNeedle = `import ${packageName}.screencapture.ScreenCapturePackage`;
  const nextWithImport = insertIfMissing(
    current,
    importNeedle,
    /import\s+com\.facebook\.react\.PackageList\s*\n/,
    `${importNeedle}\n`
  );

  const importNeedleOverlay = `import ${packageName}.overlay.OverlayControlPackage`;
  const nextWithOverlayImport = insertIfMissing(
    nextWithImport,
    importNeedleOverlay,
    /import\s+com\.facebook\.react\.PackageList\s*\n/,
    `${importNeedleOverlay}\n`
  );

  const addPackageNeedle = 'add(ScreenCapturePackage())';
  const next = insertIfMissing(
    nextWithOverlayImport,
    addPackageNeedle,
    /PackageList\(this\)\.packages\.apply\s*\{\s*\n/,
    `              ${addPackageNeedle}\n`
  );

  const addOverlayNeedle = 'add(OverlayControlPackage())';
  const next2 = insertIfMissing(
    next,
    addOverlayNeedle,
    /PackageList\(this\)\.packages\.apply\s*\{\s*\n/,
    `              ${addOverlayNeedle}\n`
  );

  if (next2 !== current) fs.writeFileSync(mainApplicationPath, next2, 'utf8');
}

function getKotlin(packageName) {
  return {
    module: `package ${packageName}.screencapture

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import androidx.annotation.UiThread
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean

class ScreenCaptureModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  companion object {
    const val NAME = "ScreenCapture"
    private const val REQUEST_CODE = 9234
  }

  private var pendingPromise: Promise? = null
  private var pendingProjection: MediaProjection? = null
  private val isCapturing = AtomicBoolean(false)

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun requestPermissionAndCapture(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current Activity.")
      return
    }
    if (pendingPromise != null) {
      promise.reject("IN_PROGRESS", "A capture request is already in progress.")
      return
    }
    pendingPromise = promise
    val mgr = activity.getSystemService(MediaProjectionManager::class.java)
    if (mgr == null) {
      pendingPromise = null
      promise.reject("NO_MANAGER", "MediaProjectionManager is unavailable.")
      return
    }
    activity.startActivityForResult(mgr.createScreenCaptureIntent(), REQUEST_CODE)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val promise = pendingPromise
    pendingPromise = null
    if (promise == null) return

    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("DENIED", "User denied screen capture permission.")
      return
    }

    try {
      val mgr = activity.getSystemService(MediaProjectionManager::class.java)
      if (mgr == null) {
        promise.reject("NO_MANAGER", "MediaProjectionManager is unavailable.")
        return
      }
      val projection = mgr.getMediaProjection(resultCode, data)
      if (projection == null) {
        promise.reject("NO_PROJECTION", "Failed to create MediaProjection.")
        return
      }
      pendingProjection = projection
      captureOnce(projection, promise)
    } catch (e: Exception) {
      promise.reject("CAPTURE_INIT_FAILED", e.message, e)
    }
  }

  override fun onNewIntent(intent: Intent) {}

  @UiThread
  private fun captureOnce(projection: MediaProjection, promise: Promise) {
    if (!isCapturing.compareAndSet(false, true)) {
      promise.reject("IN_PROGRESS", "Capture already in progress.")
      return
    }

    val activity = reactContext.currentActivity
    if (activity == null) {
      isCapturing.set(false)
      promise.reject("NO_ACTIVITY", "No current Activity.")
      return
    }

    val metrics = reactContext.resources.displayMetrics
    val width = metrics.widthPixels
    val height = metrics.heightPixels
    val density = metrics.densityDpi

    val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
    var virtualDisplay: VirtualDisplay? = null
    val handler = Handler(Looper.getMainLooper())

    val callback =
      object : MediaProjection.Callback() {
        override fun onStop() {
          cleanup(projection, virtualDisplay, imageReader, this)
        }
      }

    try {
      projection.registerCallback(callback, handler)
      virtualDisplay =
        projection.createVirtualDisplay(
          "borine-screen-capture",
          width,
          height,
          density,
          DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
          imageReader.surface,
          null,
          handler
        )
    } catch (e: Exception) {
      cleanup(projection, virtualDisplay, imageReader, callback)
      isCapturing.set(false)
      promise.reject("VIRTUAL_DISPLAY_FAILED", e.message, e)
      return
    }

    handler.postDelayed(
      {
        try {
          val image = imageReader.acquireLatestImage()
          if (image == null) {
            cleanup(projection, virtualDisplay, imageReader, callback)
            isCapturing.set(false)
            promise.reject("NO_IMAGE", "Failed to capture image.")
            return@postDelayed
          }

          val plane = image.planes[0]
          val buffer = plane.buffer
          val pixelStride = plane.pixelStride
          val rowStride = plane.rowStride
          val rowPadding = rowStride - pixelStride * width

          val bitmap =
            Bitmap.createBitmap(width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888)
          bitmap.copyPixelsFromBuffer(buffer)
          image.close()

          val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
          bitmap.recycle()

          val outFile = File(reactContext.cacheDir, "borine_screen_" + System.currentTimeMillis() + ".png")
          FileOutputStream(outFile).use { stream ->
            cropped.compress(Bitmap.CompressFormat.PNG, 100, stream)
          }
          cropped.recycle()

          cleanup(projection, virtualDisplay, imageReader, callback)
          isCapturing.set(false)
          promise.resolve(outFile.absolutePath)
        } catch (e: Exception) {
          cleanup(projection, virtualDisplay, imageReader, callback)
          isCapturing.set(false)
          promise.reject("CAPTURE_FAILED", e.message, e)
        }
      },
      1500
    )
  }

  private fun cleanup(
    projection: MediaProjection?,
    display: VirtualDisplay?,
    reader: ImageReader?,
    callback: MediaProjection.Callback?
  ) {
    try {
      display?.release()
    } catch (_: Exception) {}
    try {
      reader?.close()
    } catch (_: Exception) {}
    try {
      if (projection != null && callback != null) {
        projection.unregisterCallback(callback)
      }
    } catch (_: Exception) {}
    try {
      projection?.stop()
    } catch (_: Exception) {}
    pendingProjection = null
  }
}
`,
    pkg: `package ${packageName}.screencapture

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScreenCapturePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(ScreenCaptureModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`
  };
}

function getOverlayKotlin(packageName) {
  return {
    module: `package ${packageName}.overlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayControlModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "OverlayControl"
    const val PREFS_NAME = "malhaejwo_prefs"
    const val KEY_UNLOCKED_UNTIL = "unlocked_until"
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun setUnlockedUntil(timestamp: Double) {
    val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().putLong(KEY_UNLOCKED_UNTIL, timestamp.toLong()).apply()
  }

  @ReactMethod
  fun isOverlayPermissionGranted(promise: Promise) {
    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(reactContext)
    } else {
      true
    }
    promise.resolve(granted)
  }

  @ReactMethod
  fun isServiceRunning(promise: Promise) {
    promise.resolve(OverlayService.isRunning)
  }

  @ReactMethod
  fun openOverlayPermissionSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:" + reactContext.packageName)
    )
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun startOverlay() {
    val intent = Intent(reactContext, OverlayService::class.java).apply {
      action = OverlayService.ACTION_START
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

    @ReactMethod
    fun stopOverlay() {
      val intent = Intent(reactContext, OverlayService::class.java).apply {
        action = OverlayService.ACTION_STOP
      }
      reactContext.startService(intent)
    }

  @ReactMethod
  fun goHome() {
    val intent = Intent(Intent.ACTION_MAIN).apply {
      addCategory(Intent.CATEGORY_HOME)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun moveTaskToBack() {
    val activity = reactContext.currentActivity ?: return
    activity.moveTaskToBack(true)
  }
}
`,
    pkg: `package ${packageName}.overlay

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class OverlayControlPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(OverlayControlModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`,
    service: `package ${packageName}.overlay

import android.animation.ValueAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat

class OverlayService : Service() {

  companion object {
    @Volatile var isRunning = false
    const val ACTION_START = "BORINE_OVERLAY_START"
    const val ACTION_STOP = "BORINE_OVERLAY_STOP"
    const val ACTION_CAPTURE = "BORINE_OVERLAY_CAPTURE"
    const val ACTION_PERMISSION_CANCELED = "BORINE_OVERLAY_PERMISSION_CANCELED"
    const val ACTION_PERMISSION_GRANTED = "BORINE_OVERLAY_PERMISSION_GRANTED"

    private const val CHANNEL_ID = "borine_overlay"
    private const val NOTIFICATION_ID = 9111
    private const val CHECK_INTERVAL = 60000L // 1분마다 체크
  }

  private var wm: WindowManager? = null
  private var overlayView: View? = null
  private var dismissView: View? = null
  @Volatile private var isRequestingPermission = false
  private val handler = Handler(Looper.getMainLooper())
  private val expiryCheckRunnable = object : Runnable {
    override fun run() {
      checkExpiry()
      handler.postDelayed(this, CHECK_INTERVAL)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    ensureForeground()
    createDismissView()
    showOverlay()
    handler.post(expiryCheckRunnable)
  }

  private fun createDismissView() {
    val size = (60 * resources.displayMetrics.density).toInt()
    val params = WindowManager.LayoutParams(
      size, size,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    )
    params.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
    params.y = (60 * resources.displayMetrics.density).toInt()

    val container = FrameLayout(this).apply {
      visibility = View.GONE
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(0xFFF5F5DC.toInt()) // Beige
        setStroke((2 * resources.displayMetrics.density).toInt(), 0x33000000.toInt())
      }
    }

    val xIcon = ImageView(this).apply {
      layoutParams = FrameLayout.LayoutParams((24 * resources.displayMetrics.density).toInt(), (24 * resources.displayMetrics.density).toInt()).apply {
        gravity = Gravity.CENTER
      }
      setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
      setColorFilter(0xFF8B4513.toInt()) // Saddle Brown for X
    }
    container.addView(xIcon)

    dismissView = container
    wm?.addView(container, params)
  }

  private fun checkExpiry() {
    val prefs = getSharedPreferences("malhaejwo_prefs", Context.MODE_PRIVATE)
    val unlockedUntil = prefs.getLong("unlocked_until", 0L)
    if (unlockedUntil > 0 && System.currentTimeMillis() > unlockedUntil) {
      stopSelf()
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        ensureForeground()
        showOverlay()
      }
      ACTION_STOP -> {
        isRequestingPermission = false
        stopSelf()
      }
      ACTION_PERMISSION_CANCELED,
      ACTION_PERMISSION_GRANTED -> {
        isRequestingPermission = false
      }
      ACTION_CAPTURE -> {
        openPermissionRequest()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    isRunning = false
    handler.removeCallbacks(expiryCheckRunnable)
    try {
      if (overlayView != null) wm?.removeView(overlayView)
      if (dismissView != null) wm?.removeView(dismissView)
    } catch (_: Exception) {}
    overlayView = null
    dismissView = null
    stopForeground(STOP_FOREGROUND_REMOVE)
  }

  private fun ensureForeground() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel =
        NotificationChannel(CHANNEL_ID, "Borine Malhaejwo", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "Overlay toggle is active."
        }
      nm.createNotificationChannel(channel)
    }

    val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val pending =
      PendingIntent.getActivity(
        this,
        0,
        openIntent,
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0) or PendingIntent.FLAG_UPDATE_CURRENT
      )

    val stopIntent = Intent(this, OverlayService::class.java).apply {
      action = ACTION_STOP
    }
    val stopPending =
      PendingIntent.getService(
        this,
        1,
        stopIntent,
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0) or PendingIntent.FLAG_UPDATE_CURRENT
      )

    val notification: Notification =
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(applicationInfo.icon)
        .setContentTitle("Borine Malhaejwo")
        .setContentText("Overlay toggle is active.")
        .setContentIntent(pending)
        .addAction(0, "Stop", stopPending)
        .setOngoing(true)
        .build()

    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun showOverlay() {
    if (overlayView != null) return
    val displayMetrics = resources.displayMetrics
    val screenWidth = displayMetrics.widthPixels
    val screenHeight = displayMetrics.heightPixels

    val params =
      WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT
      )
    params.gravity = Gravity.TOP or Gravity.START
    params.x = 0
    params.y = screenHeight / 3

    val size = (72 * displayMetrics.density).toInt()
    val iconSize = (48 * displayMetrics.density).toInt()

    val container = FrameLayout(this).apply {
      layoutParams = WindowManager.LayoutParams(size, size)
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(0xCCFFFFFF.toInt())
        setStroke((2 * displayMetrics.density).toInt(), 0x33000000.toInt())
      }
      elevation = 10f
    }

    val icon = ImageView(this).apply {
      layoutParams = FrameLayout.LayoutParams(iconSize, iconSize).apply {
        gravity = Gravity.CENTER
      }
      setImageDrawable(packageManager.getApplicationIcon(packageName))
      scaleType = ImageView.ScaleType.CENTER_INSIDE
    }
    container.addView(icon)

    var lastX = 0
    var lastY = 0
    var touchX = 0f
    var touchY = 0f
    var moved = false

    container.setOnTouchListener { v, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          moved = false
          lastX = params.x
          lastY = params.y
          touchX = event.rawX
          touchY = event.rawY
          dismissView?.visibility = View.VISIBLE
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - touchX).toInt()
          val dy = (event.rawY - touchY).toInt()
          if (kotlin.math.abs(dx) > 10 || kotlin.math.abs(dy) > 10) moved = true
          
          params.x = lastX + dx
          params.y = lastY + dy
          wm?.updateViewLayout(container, params)

          val centerX = screenWidth / 2
          val dismissY = screenHeight - (120 * displayMetrics.density).toInt()
          val dist = Math.sqrt(
            Math.pow((params.x + size / 2 - centerX).toDouble(), 2.0) +
            Math.pow((params.y + size / 2 - dismissY).toDouble(), 2.0)
          )

          if (dist < 200) {
            (dismissView?.background as? GradientDrawable)?.setColor(0xFFEEDD82.toInt()) // Active Beige
          } else {
            (dismissView?.background as? GradientDrawable)?.setColor(0xFFF5F5DC.toInt()) // Normal Beige
          }
          true
        }
        MotionEvent.ACTION_UP -> {
          dismissView?.visibility = View.GONE
          
          if (!moved) {
            // 캡처 버튼 클릭 시 즉시 권한 요청 액티비티를 시작합니다.
            // 해당 액티비티 내에서 우리 앱을 백그라운드로 밀어내는 처리를 할 것입니다.
            startService(Intent(this, OverlayService::class.java).apply { action = ACTION_CAPTURE })
          } else {
            val centerX = screenWidth / 2
            val dismissY = screenHeight - (120 * displayMetrics.density).toInt()
            val dist = Math.sqrt(
              Math.pow((params.x + size / 2 - centerX).toDouble(), 2.0) +
              Math.pow((params.y + size / 2 - dismissY).toDouble(), 2.0)
            )

            if (dist < 200) {
              stopSelf()
            } else {
              val targetX = if (params.x + size / 2 < screenWidth / 2) 0 else screenWidth - size
              val animator = ValueAnimator.ofInt(params.x, targetX)
              animator.duration = 300
              animator.interpolator = DecelerateInterpolator()
              animator.addUpdateListener { animation ->
                params.x = animation.animatedValue as Int
                try { wm?.updateViewLayout(container, params) } catch (_: Exception) {}
              }
              animator.start()
            }
          }
          true
        }
        else -> false
      }
    }

    overlayView = container
    wm?.addView(container, params)
  }

  private fun openPermissionRequest() {
    if (isRequestingPermission) return
    isRequestingPermission = true
    val intent = Intent(this, ScreenCapturePermissionActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    startActivity(intent)
  }
}
`,

    captureService: `package ${packageName}.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.net.URLEncoder

class CaptureService : Service() {

  companion object {
    const val ACTION_CAPTURE = "BORINE_CAPTURE_START"
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_DATA_INTENT = "dataIntent"

    private const val CHANNEL_ID = "borine_capture"
    private const val NOTIFICATION_ID = 9222
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action != ACTION_CAPTURE) {
      stopSelf()
      return START_NOT_STICKY
    }

    ensureForeground()

    val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
    val data = intent.getParcelableExtra<Intent>(EXTRA_DATA_INTENT)
    if (data == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    Thread {
      val holder = MediaProjectionHolder(this, resultCode, data)
      val file = holder.captureOnceToPng()
      holder.stop()
      if (file != null) {
        val fileUri = "file://" + file.absolutePath
        val encoded = URLEncoder.encode(fileUri, "UTF-8")
        val deepLink = "borinemalhaejwo://capture?imageUri=" + encoded
        val open = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(open)
      }
      stopSelf()
    }.start()

    return START_NOT_STICKY
  }

  private fun ensureForeground() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel =
        NotificationChannel(CHANNEL_ID, "Borine Capture", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Capturing the screen."
        }
      nm.createNotificationChannel(channel)
    }

    val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val pending =
      PendingIntent.getActivity(
        this,
        0,
        openIntent,
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0) or PendingIntent.FLAG_UPDATE_CURRENT
      )

    val notification: Notification =
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(applicationInfo.icon)
        .setContentTitle("Borine Capture")
        .setContentText("Capturing screen.")
        .setContentIntent(pending)
        .setOngoing(true)
        .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
`,
    holder: `package ${packageName}.overlay

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.Looper
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean

class MediaProjectionHolder(private val context: Context, private val resultCode: Int, private val data: Intent) {

  private var projection: MediaProjection? = null
  private val isCapturing = AtomicBoolean(false)

  fun isReady(): Boolean = projection != null

  private fun ensureProjection(): MediaProjection? {
    if (projection != null) return projection
    val mgr = context.getSystemService(MediaProjectionManager::class.java) ?: return null
    projection = mgr.getMediaProjection(resultCode, data)
    return projection
  }

  fun captureOnceToPng(): File? {
    val proj = ensureProjection() ?: return null
    if (!isCapturing.compareAndSet(false, true)) return null

    try {
      val metrics = context.resources.displayMetrics
      val width = metrics.widthPixels
      val height = metrics.heightPixels
      val density = metrics.densityDpi
      val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
      var virtualDisplay: VirtualDisplay? = null
      val handler = Handler(Looper.getMainLooper())

      val callback =
        object : MediaProjection.Callback() {
          override fun onStop() {
            try {
              virtualDisplay?.release()
            } catch (_: Exception) {}
            try {
              imageReader.close()
            } catch (_: Exception) {}
            try {
              proj.unregisterCallback(this)
            } catch (_: Exception) {}
            projection = null
          }
        }

      proj.registerCallback(callback, handler)

      virtualDisplay =
        proj.createVirtualDisplay(
          "borine-overlay-capture",
          width,
          height,
          density,
          DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
          imageReader.surface,
          null,
          handler
        )

      Thread.sleep(1500)

      val image = imageReader.acquireLatestImage() ?: run {
        virtualDisplay?.release()
        imageReader.close()
        return null
      }

      val plane = image.planes[0]
      val buffer = plane.buffer
      val pixelStride = plane.pixelStride
      val rowStride = plane.rowStride
      val rowPadding = rowStride - pixelStride * width

      val bitmap =
        Bitmap.createBitmap(width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888)
      bitmap.copyPixelsFromBuffer(buffer)
      image.close()

      val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
      bitmap.recycle()

      val outFile = File(context.cacheDir, "borine_overlay_" + System.currentTimeMillis() + ".png")
      FileOutputStream(outFile).use { stream ->
        cropped.compress(Bitmap.CompressFormat.PNG, 100, stream)
      }
      cropped.recycle()

      virtualDisplay?.release()
      imageReader.close()
      try {
        proj.unregisterCallback(callback)
      } catch (_: Exception) {}
      try {
        projection?.stop()
      } catch (_: Exception) {}
      projection = null
      return outFile
    } catch (_: Exception) {
      return null
    } finally {
      isCapturing.set(false)
    }
  }

  fun stop() {
    try {
      projection?.stop()
    } catch (_: Exception) {}
    projection = null
  }
}
`,
    permissionActivity: `package ${packageName}.overlay

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle

class ScreenCapturePermissionActivity : Activity() {

  companion object {
    private const val REQUEST_CODE = 9234
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // 캡처 권한 요청 전에 우리 앱을 백그라운드로 숨깁니다.
    // 이렇게 하면 권한 팝업이 '이전 앱' 위에 뜨게 되고, 
    // 팝업이 사라진 직후에 찍히는 스크린샷에 우리 앱이 포함되지 않습니다.
    moveTaskToBack(true)

    val mgr = getSystemService(MediaProjectionManager::class.java)
    if (mgr == null) {
      finish()
      return
    }
    startActivityForResult(mgr.createScreenCaptureIntent(), REQUEST_CODE)
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != REQUEST_CODE) return
    if (resultCode != RESULT_OK || data == null) {
      startService(Intent(this, OverlayService::class.java).apply {
        action = OverlayService.ACTION_PERMISSION_CANCELED
      })
      moveTaskToBack(true)
      finish()
      return
    }

    startService(Intent(this, OverlayService::class.java).apply {
      action = OverlayService.ACTION_PERMISSION_GRANTED
    })
    val captureIntent = Intent(this, CaptureService::class.java).apply {
      action = CaptureService.ACTION_CAPTURE
      putExtra(CaptureService.EXTRA_RESULT_CODE, resultCode)
      putExtra(CaptureService.EXTRA_DATA_INTENT, data)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(captureIntent)
    } else {
      startService(captureIntent)
    }

    moveTaskToBack(true)
    finish()
  }
}
`
  };
}

module.exports = function withScreenCaptureAndroid(config) {
  config = withFixedStrings(config);
  config = withAndroidManifest(config, (config2) => {
    const androidManifest = config2.modResults;

    AndroidConfig.Permissions.ensurePermissions(androidManifest, [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.POST_NOTIFICATIONS',
      // SYSTEM_ALERT_WINDOW is a special app-op permission, but declaring it doesn't hurt.
      'android.permission.SYSTEM_ALERT_WINDOW'
    ]);

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // 태블릿 및 대화면 지원을 위해 매니페스트 속성 추가
    app.$['android:resizeableActivity'] = 'true';
    
    // 메인 액티비티에도 추가
    const mainActivity = app.activity.find(a => a.$['android:name'] === '.MainActivity');
    if (mainActivity) {
      mainActivity.$['android:resizeableActivity'] = 'true';
    }

    app['meta-data'] = app['meta-data'] ?? [];
    if (!app['meta-data'].some(m => m.$['android:name'] === 'android.max_aspect')) {
      app['meta-data'].push({
        $: {
          'android:name': 'android.max_aspect',
          'android:value': '2.4'
        }
      });
    }

    app.service = app.service ?? [];
    if (!app.service.some((s) => s?.$?.['android:name'] === '.overlay.OverlayService')) {
      app.service.push({
        $: {
          'android:name': '.overlay.OverlayService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse'
        },
        property: [
          {
            $: {
              'android:name': 'android.app.special_use_fgs_subtype',
              'android:value': 'overlay-toggle'
            }
          }
        ]
      });
    }

    if (!app.service.some((s) => s?.$?.['android:name'] === '.overlay.CaptureService')) {
      app.service.push({
        $: {
          'android:name': '.overlay.CaptureService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaProjection'
        }
      });
    }

    app.activity = app.activity ?? [];
    if (!app.activity.some((a) => a?.$?.['android:name'] === '.overlay.ScreenCapturePermissionActivity')) {
      app.activity.push({
        $: {
          'android:name': '.overlay.ScreenCapturePermissionActivity',
          'android:exported': 'false',
          'android:excludeFromRecents': 'true',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar.Fullscreen'
        }
      });
    }

    return config2;
  });

  config = withAndroidSplashStyles(config);

  return withDangerousMod(config, [
    'android',
    async (config2) => {
      const projectRoot = config2.modRequest.platformProjectRoot;
      const appRoot = config2.modRequest.projectRoot;
      const packageName = config2.android?.package ?? 'boinre.malhaejwo';
      const packageDir = packageName.replace(/\./g, path.sep);
      const javaRoot = path.join(projectRoot, 'app', 'src', 'main', 'java');
      const moduleDir = path.join(javaRoot, packageDir, 'screencapture');

      const buildGradlePath = path.join(projectRoot, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        const current = fs.readFileSync(buildGradlePath, 'utf8');
        const next = ensureReactRoot(current);
        if (next !== current) fs.writeFileSync(buildGradlePath, next, 'utf8');
      }

      const kotlin = getKotlin(packageName);
      writeFileIfChanged(path.join(moduleDir, 'ScreenCaptureModule.kt'), kotlin.module);
      writeFileIfChanged(path.join(moduleDir, 'ScreenCapturePackage.kt'), kotlin.pkg);

      const overlayDir = path.join(javaRoot, packageDir, 'overlay');
      const overlay = getOverlayKotlin(packageName);
      writeFileIfChanged(path.join(overlayDir, 'OverlayControlModule.kt'), overlay.module);
      writeFileIfChanged(path.join(overlayDir, 'OverlayControlPackage.kt'), overlay.pkg);
      writeFileIfChanged(path.join(overlayDir, 'OverlayService.kt'), overlay.service);
      writeFileIfChanged(path.join(overlayDir, 'CaptureService.kt'), overlay.captureService);
      writeFileIfChanged(path.join(overlayDir, 'MediaProjectionHolder.kt'), overlay.holder);
      writeFileIfChanged(path.join(overlayDir, 'ScreenCapturePermissionActivity.kt'), overlay.permissionActivity);

      ensureSplashBranding(projectRoot, appRoot);
      patchAdaptiveIcon(projectRoot);

      const mainApplicationPath = path.join(javaRoot, packageDir, 'MainApplication.kt');
      patchMainApplication(mainApplicationPath, packageName);
      return config2;
    }
  ]);
};
