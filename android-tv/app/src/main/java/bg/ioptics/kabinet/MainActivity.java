package bg.ioptics.kabinet;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * iOptics Кабинет за Android TV.
 *
 * Страницата на кабинета е вградена в приложението (assets/www) и се показва в WebView
 * под адреса https://ioptics-bg.com/kabinet/ – заявките към него се обслужват локално,
 * без интернет. Така Firebase вижда същия разрешен домейн като сайта, а таблицата
 * работи и офлайн след първия вход.
 */
public class MainActivity extends Activity {

    private static final String HOST = "ioptics-bg.com";
    private static final String START_URL = "https://" + HOST + "/kabinet/";

    private WebView web;
    private long lastBack = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFFF5F6F3);
        setContentView(web);
        hideSystemBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Bridge(), "KabinetAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new LocalClient());
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
        web.requestFocus();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    /** Бутонът Назад: стъпка назад в приложението; на началния екран – два пъти за изход. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP) handleBack();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (web.canGoBack()) { web.goBack(); return; }
        long now = System.currentTimeMillis();
        if (now - lastBack < 2500) { finish(); return; }
        lastBack = now;
        Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Връзка от страницата към приложението (window.KabinetAndroid). */
    private class Bridge {
        @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void exit() { runOnUiThread(MainActivity.this::finish); }
    }

    /** Обслужва https://ioptics-bg.com/kabinet/… и /images/logo.png от вградените файлове. */
    private class LocalClient extends WebViewClient {
        private final Map<String, String> MIME = new HashMap<>();
        { MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
          MIME.put("png", "image/png"); MIME.put("jpg", "image/jpeg"); MIME.put("svg", "image/svg+xml");
          MIME.put("json", "application/json"); MIME.put("webp", "image/webp"); }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return null;
            String path = u.getPath() == null ? "/" : u.getPath();
            if (!path.startsWith("/kabinet/") && !path.startsWith("/images/")) return null;
            if (path.endsWith("/")) path += "index.html";
            String asset = "www" + path;
            try {
                AssetManager am = getAssets();
                InputStream in = am.open(asset);
                String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
                String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
                WebResourceResponse r = new WebResourceResponse(mime, "utf-8", in);
                Map<String, String> h = new HashMap<>();
                h.put("Cache-Control", "no-cache");
                h.put("Access-Control-Allow-Origin", "*");
                r.setResponseHeaders(h);
                return r;
            } catch (IOException e) {
                return null; // няма го вградено – зарежда се от интернет
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            String host = u.getHost() == null ? "" : u.getHost();
            String path = u.getPath() == null ? "" : u.getPath();
            // Кабинетът остава в приложението; всичко друго (сайтът, линкове от писма) – в браузъра.
            if (HOST.equals(host) && path.startsWith("/kabinet")) return false;
            if (host.endsWith("firebaseapp.com") || host.endsWith("googleapis.com") || host.endsWith("google.com")) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
            return true;
        }
    }
}
