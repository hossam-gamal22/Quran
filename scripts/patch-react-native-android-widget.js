const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidMain = path.join(root, 'node_modules/react-native-android-widget/android/src/main');
const javaPath = path.join(androidMain, 'java/com/reactnativeandroidwidget/RNWidget.java');
const textWidgetBuilderPath = path.join(androidMain, 'java/com/reactnativeandroidwidget/builder/widget/TextWidget.java');
const imageWidgetBuilderPath = path.join(androidMain, 'java/com/reactnativeandroidwidget/builder/widget/ImageWidget.java');
const imageWidgetJsPath = path.join(root, 'node_modules/react-native-android-widget/src/widgets/ImageWidget.tsx');
const layoutPath = path.join(androidMain, 'res/layout/rn_widget.xml');
const nightLayoutPath = path.join(androidMain, 'res/layout-night/rn_widget.xml');
const assetFontPath = path.join(root, 'android/app/src/main/assets/fonts/Rubik-Medium.ttf');
const sourceFontPath = path.join(root, 'assets/fonts/Rubik-Medium.ttf');
const resourceFontPath = path.join(root, 'android/app/src/main/res/font/rubik_medium.ttf');
const assetBoldFontPath = path.join(root, 'android/app/src/main/assets/fonts/Rubik-Bold.ttf');
const sourceBoldFontPath = path.join(root, 'assets/fonts/Rubik-Bold.ttf');
const resourceBoldFontPath = path.join(root, 'android/app/src/main/res/font/rubik_bold.ttf');

function replaceOnce(source, needle, replacement, file) {
  if (!source.includes(needle)) {
    throw new Error(`Could not patch ${file}: missing expected source block`);
  }
  return source.replace(needle, replacement);
}

function patchJava() {
  let source = fs.readFileSync(javaPath, 'utf8');
  if (source.includes('configureNativeTextOverlays(RemoteViews remoteWidgetView')) return;

  source = replaceOnce(source, 'import android.content.Intent;\n', 'import android.content.Intent;\nimport android.content.SharedPreferences;\n', javaPath);
  source = replaceOnce(source, 'import android.util.Base64;\nimport android.view.View;\n', 'import android.util.Base64;\nimport android.util.TypedValue;\nimport android.view.Gravity;\nimport android.view.View;\n', javaPath);
  source = replaceOnce(source, 'import com.facebook.react.bridge.ReactApplicationContext;\n', 'import com.facebook.react.bridge.ReactApplicationContext;\nimport com.facebook.react.bridge.ReadableArray;\n', javaPath);
  source = replaceOnce(source, 'import java.util.List;\n', 'import java.util.List;\n\nimport org.json.JSONArray;\n', javaPath);
  source = replaceOnce(
    source,
    '        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {\n            addClickableAreas(widgetId, remoteWidgetView, widgetWithViews);\n',
    '        configureNativeTextOverlays(remoteWidgetView, light, widgetId);\n\n        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {\n            addClickableAreas(widgetId, remoteWidgetView, widgetWithViews);\n',
    javaPath,
  );
  source = replaceOnce(
    source,
    '\n    public WritableMap createPreview(int width, int height) throws Exception {\n',
    `
    private static final int[] nativeTextContainers = {
        R.id.rn_widget_live_text_0_container,
        R.id.rn_widget_live_text_1_container
    };
    private static final int[] nativeTextViews = {
        R.id.rn_widget_live_text_0,
        R.id.rn_widget_live_text_1
    };

    private void configureNativeTextOverlays(RemoteViews remoteWidgetView, ReadableMap config, int widgetId) {
        for (int container : nativeTextContainers) remoteWidgetView.setViewVisibility(container, View.GONE);
        ReadableArray overlays = findNativeTextOverlays(config);
        SharedPreferences preferences = appContext.getSharedPreferences(
            appContext.getPackageName() + ".WIDGET_NATIVE_TEXT",
            android.content.Context.MODE_PRIVATE
        );
        if (overlays == null || overlays.size() == 0) {
            preferences.edit().remove(String.valueOf(widgetId)).apply();
            return;
        }
        preferences.edit().putString(String.valueOf(widgetId), new JSONArray(overlays.toArrayList()).toString()).apply();
        int widthDp = RNWidgetUtil.getWidgetWidth(appContext, widgetId);
        int heightDp = RNWidgetUtil.getWidgetHeight(appContext, widgetId);
        for (int index = 0; index < Math.min(overlays.size(), nativeTextViews.length); index++) {
            ReadableMap overlay = overlays.getMap(index);
            int container = nativeTextContainers[index];
            int textView = nativeTextViews[index];
            remoteWidgetView.setViewVisibility(container, View.VISIBLE);
            remoteWidgetView.setViewPadding(
                container,
                RNWidgetUtil.dpToPx(appContext, widthDp * getDouble(overlay, "leftFraction", 0)),
                RNWidgetUtil.dpToPx(appContext, heightDp * getDouble(overlay, "topFraction", 0)),
                RNWidgetUtil.dpToPx(appContext, widthDp * getDouble(overlay, "rightFraction", 0)),
                RNWidgetUtil.dpToPx(appContext, heightDp * getDouble(overlay, "bottomFraction", 0))
            );
            remoteWidgetView.setTextViewText(textView, boldSpan(overlay.hasKey("text") ? overlay.getString("text") : ""));
            remoteWidgetView.setInt(textView, "setGravity", overlayGravity(overlay));
            remoteWidgetView.setTextViewTextSize(textView, TypedValue.COMPLEX_UNIT_DIP, (float) getDouble(overlay, "fontSize", 9));
            if (overlay.hasKey("color")) remoteWidgetView.setTextColor(textView, android.graphics.Color.parseColor(overlay.getString("color")));
        }
    }

    // App-widget TextViews in the launcher process ignore android:fontFamily="@font/..",
    // so the live overlay rendered at the system font's regular weight. StyleSpan is a
    // ParcelableSpan that survives the cross-process Parcel and forces bold.
    private CharSequence boldSpan(String text) {
        android.text.SpannableString s = new android.text.SpannableString(text == null ? "" : text);
        s.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, s.length(), android.text.Spannable.SPAN_INCLUSIVE_INCLUSIVE);
        return s;
    }

    private int overlayGravity(ReadableMap overlay) {
        if (!overlay.hasKey("textAlign")) return Gravity.CENTER;
        String align = overlay.getString("textAlign");
        // Absolute LEFT/RIGHT (not direction-relative START/END): the live
        // countdown is positioned at the dp rect captured from the preview, so
        // it must hug the box's absolute edge regardless of the widget's RTL
        // layout direction. With START/END, "right" resolved to LEFT under an
        // Arabic/RTL host and the (shorter) live countdown drifted left of the
        // hero name. RNAW's own TextWidget builder uses absolute LEFT/RIGHT too.
        if ("left".equals(align)) return Gravity.LEFT | Gravity.CENTER_VERTICAL;
        if ("right".equals(align)) return Gravity.RIGHT | Gravity.CENTER_VERTICAL;
        return Gravity.CENTER;
    }

    private ReadableArray findNativeTextOverlays(ReadableMap config) {
        if (config.hasKey("props")) {
            ReadableMap props = config.getMap("props");
            if (props != null && props.hasKey("clickActionData")) {
                ReadableMap data = props.getMap("clickActionData");
                if (data != null && data.hasKey("nativeTextOverlays")) return data.getArray("nativeTextOverlays");
            }
        }
        if (config.hasKey("children")) {
            com.facebook.react.bridge.ReadableArray children = config.getArray("children");
            if (children != null) for (int i = 0; i < children.size(); i++) {
                ReadableArray found = findNativeTextOverlays(children.getMap(i));
                if (found != null) return found;
            }
        }
        return null;
    }

    private double getDouble(ReadableMap map, String key, double fallback) {
        return map.hasKey(key) ? map.getDouble(key) : fallback;
    }

    public WritableMap createPreview(int width, int height) throws Exception {
`,
    javaPath,
  );
  fs.writeFileSync(javaPath, source);
}

function patchLayout(file) {
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/android:includeFontPadding="false"/g, 'android:includeFontPadding="true"');
  if (source.includes('rn_widget_live_text_0_container')) {
    fs.writeFileSync(file, source);
    return;
  }
  source = replaceOnce(
    source,
    '    <FrameLayout\n        android:id="@+id/rn_widget_clickable_container"',
    `    <FrameLayout
        android:id="@+id/rn_widget_live_text_0_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:visibility="gone">

        <TextView
            android:id="@+id/rn_widget_live_text_0"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:fontFamily="@font/rubik_bold"
            android:gravity="center"
            android:includeFontPadding="true"
            android:maxLines="1"
            android:textColor="#5E5E5C"
            android:textSize="9dp" />
    </FrameLayout>

    <FrameLayout
        android:id="@+id/rn_widget_live_text_1_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:visibility="gone">

        <TextView
            android:id="@+id/rn_widget_live_text_1"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:fontFamily="@font/rubik_bold"
            android:gravity="center"
            android:includeFontPadding="true"
            android:maxLines="1"
            android:textColor="#5E5E5C"
            android:textSize="9dp" />
    </FrameLayout>

    <FrameLayout
        android:id="@+id/rn_widget_clickable_container"`,
    file,
  );
  fs.writeFileSync(file, source);
}

function copyFont() {
  const mediumSrc = fs.existsSync(assetFontPath) ? assetFontPath : sourceFontPath;
  const boldSrc = fs.existsSync(assetBoldFontPath) ? assetBoldFontPath : sourceBoldFontPath;
  fs.mkdirSync(path.dirname(resourceFontPath), { recursive: true });
  fs.copyFileSync(mediumSrc, resourceFontPath);
  // Bold variant for the live countdown text views (rn_widget_live_text_*),
  // which now use @font/rubik_bold so the AlarmManager minute-tick renders the
  // bold countdown (matching the bold JS seed — otherwise it flickers to medium).
  fs.copyFileSync(boldSrc, resourceBoldFontPath);
  // The patched rn_widget.xml lives in the LIBRARY module and references
  // @font/rubik_bold, which resolves to the library's own package
  // (com.reactnativeandroidwidget). The app-module copy above is not visible to
  // the library's `verifyReleaseResources` task, so a release build fails with
  // "resource font/rubik_bold not found". Mirror the fonts into the library res
  // so both the library verify and runtime inflation resolve the glyph.
  const libFontDir = path.join(androidMain, 'res/font');
  fs.mkdirSync(libFontDir, { recursive: true });
  fs.copyFileSync(mediumSrc, path.join(libFontDir, 'rubik_medium.ttf'));
  fs.copyFileSync(boldSrc, path.join(libFontDir, 'rubik_bold.ttf'));
}

// Disable the TextView's default top font padding so live RNAW text matches the
// React Native previews (which all render with `includeFontPadding: false`). The
// prayer-widget overlay (hero time + per-prayer row times) is positioned at the
// dp rect captured from the preview; with font padding ON, the native glyph sat
// a few px lower than the baked chrome expected — the source of the gallery-vs-
// home misalignment. This aligns every RNAW TextView's vertical metrics with the
// preview render.
function patchTextWidgetFontPadding() {
  let source = fs.readFileSync(textWidgetBuilderPath, 'utf8');
  if (source.includes('view.setIncludeFontPadding(false)')) return;
  source = replaceOnce(
    source,
    '        view.setText(getString("text", ""));\n',
    '        view.setText(getString("text", ""));\n        view.setIncludeFontPadding(false);\n',
    textWidgetBuilderPath,
  );
  fs.writeFileSync(textWidgetBuilderPath, source);
}

// Add a `tintColor` prop to ImageWidget so a single-colour transparent PNG
// (e.g. black text on full transparency) can be recoloured to the active
// theme's text colour at render time. The library renders the whole widget
// tree to a single bitmap, so applying a SRC_IN colour filter on the ImageView
// bakes the tint into that bitmap. Used by the curated Arabic-only image
// widgets (verse/azkar/dhikr).
function patchImageWidgetTint() {
  // Native (runtime render): apply the colour filter.
  let java = fs.readFileSync(imageWidgetBuilderPath, 'utf8');
  if (!java.includes('setColorFilter')) {
    java = replaceOnce(
      java,
      '        view.setImageDrawable(bitmapDrawable);\n',
      `        view.setImageDrawable(bitmapDrawable);

        if (props.hasKey("tintColor")) {
            view.setColorFilter(
                android.graphics.Color.parseColor(props.getString("tintColor")),
                android.graphics.PorterDuff.Mode.SRC_IN
            );
        }
`,
      imageWidgetBuilderPath,
    );
    fs.writeFileSync(imageWidgetBuilderPath, java);
  }

  // JS (Metro reads the package's `react-native` field → src/): forward the
  // prop to native and surface it on the public props type.
  let js = fs.readFileSync(imageWidgetJsPath, 'utf8');
  if (!js.includes('tintColor')) {
    js = replaceOnce(
      js,
      '  /**\n   * Image radius\n   */\n  radius?: number;\n}',
      '  /**\n   * Image radius\n   */\n  radius?: number;\n  /**\n   * Optional SRC_IN tint applied to the image (hex string, e.g. "#FFFFFF").\n   */\n  tintColor?: string;\n}',
      imageWidgetJsPath,
    );
    js = replaceOnce(
      js,
      '    ...(props.radius ? { radius: props.radius } : {}),\n  };',
      '    ...(props.radius ? { radius: props.radius } : {}),\n    ...(props.tintColor ? { tintColor: props.tintColor } : {}),\n  };',
      imageWidgetJsPath,
    );
    fs.writeFileSync(imageWidgetJsPath, js);
  }
}

patchJava();
patchLayout(layoutPath);
patchLayout(nightLayoutPath);
patchTextWidgetFontPadding();
patchImageWidgetTint();
copyFont();
console.log('react-native-android-widget native text overlay patch applied');
