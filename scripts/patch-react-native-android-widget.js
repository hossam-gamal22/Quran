const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidMain = path.join(root, 'node_modules/react-native-android-widget/android/src/main');
const javaPath = path.join(androidMain, 'java/com/reactnativeandroidwidget/RNWidget.java');
const layoutPath = path.join(androidMain, 'res/layout/rn_widget.xml');
const nightLayoutPath = path.join(androidMain, 'res/layout-night/rn_widget.xml');
const assetFontPath = path.join(root, 'android/app/src/main/assets/fonts/Rubik-Medium.ttf');
const sourceFontPath = path.join(root, 'assets/fonts/Rubik-Medium.ttf');
const resourceFontPath = path.join(root, 'android/app/src/main/res/font/rubik_medium.ttf');

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
            remoteWidgetView.setTextViewText(textView, overlay.hasKey("text") ? overlay.getString("text") : "");
            remoteWidgetView.setInt(textView, "setGravity", overlayGravity(overlay));
            remoteWidgetView.setTextViewTextSize(textView, TypedValue.COMPLEX_UNIT_DIP, (float) getDouble(overlay, "fontSize", 9));
            if (overlay.hasKey("color")) remoteWidgetView.setTextColor(textView, android.graphics.Color.parseColor(overlay.getString("color")));
        }
    }

    private int overlayGravity(ReadableMap overlay) {
        if (!overlay.hasKey("textAlign")) return Gravity.CENTER;
        String align = overlay.getString("textAlign");
        if ("left".equals(align)) return Gravity.START | Gravity.CENTER_VERTICAL;
        if ("right".equals(align)) return Gravity.END | Gravity.CENTER_VERTICAL;
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
            android:fontFamily="@font/rubik_medium"
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
            android:fontFamily="@font/rubik_medium"
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
  fs.mkdirSync(path.dirname(resourceFontPath), { recursive: true });
  fs.copyFileSync(fs.existsSync(assetFontPath) ? assetFontPath : sourceFontPath, resourceFontPath);
}

patchJava();
patchLayout(layoutPath);
patchLayout(nightLayoutPath);
copyFont();
console.log('react-native-android-widget native text overlay patch applied');
