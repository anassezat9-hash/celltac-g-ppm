package com.celltac.gppm;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQ = 1001;
    private static final int CAMERA_REQ = 1002;
    private static final String START_URL = "https://anassezat9-hash.github.io/celltac-g-ppm/?app=android";
    private WebView webView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> filePathCallback;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(6, 78, 89));
        window.setNavigationBarColor(Color.rgb(6, 78, 89));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) window.getDecorView().setSystemUiVisibility(0);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);
        progress = findViewById(R.id.progress);
        configureWebView();
        webView.loadUrl(START_URL);
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);

        // Force the same desktop layout used in the browser dashboard.
        s.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36");

        webView.setVerticalScrollBarEnabled(true);
        webView.setHorizontalScrollBarEnabled(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.addJavascriptInterface(new DownloadBridge(), "AndroidDownload");

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("https://anassezat9-hash.github.io/") || url.startsWith("https://zyzyavjwdxprwjutnkgf.supabase.co/")) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                installAndroidDownloadHook(view);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                startActivityForResult(intent, FILE_CHOOSER_REQ);
                return true;
            }

            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (request.getResources().length == 0) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        request.deny();
                        requestCameraPermission();
                    }
                });
            }

            @Override public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }
        });
    }

    private void requestCameraPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQ);
        }
    }

    private void installAndroidDownloadHook(WebView view) {
        String js = "javascript:(function(){" +
            "if(window.__androidDownloadHookInstalled)return;window.__androidDownloadHookInstalled=true;" +
            "window.__nativeDownloadResult=function(ok,name){if(!ok)alert('تعذر حفظ الملف: '+name);};" +
            "if(window.XLSX&&XLSX.writeFile){var original=XLSX.writeFile;XLSX.writeFile=function(wb,name,opts){" +
            "try{var b64=XLSX.write(wb,{bookType:'xlsx',type:'base64'});" +
            "if(window.AndroidDownload){window.AndroidDownload.saveBase64(String(name||'CelltacGPPM_Report.xlsx'),b64);return;}" +
            "}catch(e){console.error(e);}return original.call(XLSX,wb,name,opts);};}" +
            "})();";
        view.evaluateJavascript(js, null);
    }

    public class DownloadBridge {
        @JavascriptInterface
        public void saveBase64(String filename, String base64) {
            runOnUiThread(() -> saveFile(filename, base64));
        }
    }

    private void saveFile(String filename, String base64) {
        try {
            String safe = filename == null ? "CelltacGPPM_Report.xlsx" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (!safe.toLowerCase().endsWith(".xlsx")) safe += ".xlsx";
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            OutputStream out;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("Unable to create Downloads file");
                out = getContentResolver().openOutputStream(uri);
                if (out == null) throw new Exception("Unable to open Downloads file");
                out.write(bytes); out.close();
                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, done, null, null);
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Unable to create Downloads folder");
                File file = new File(dir, safe);
                out = new FileOutputStream(file);
                out.write(bytes); out.close();
            }
            Toast.makeText(this, "تم حفظ ملف Excel في مجلد Downloads", Toast.LENGTH_LONG).show();
            webView.evaluateJavascript("window.__nativeDownloadResult&&window.__nativeDownloadResult(true,'" + safe.replace("'", "") + "')", null);
        } catch (Exception e) {
            String error = e.getMessage() == null ? "Download failed" : e.getMessage();
            Toast.makeText(this, "فشل حفظ الملف: " + error, Toast.LENGTH_LONG).show();
            webView.evaluateJavascript("window.__nativeDownloadResult&&window.__nativeDownloadResult(false,'" + error.replace("'", "") + "')", null);
        }
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQ && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) results = new Uri[]{data.getData()};
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_REQ && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "تم السماح بالكاميرا، أعد فتح الماسح إذا لزم الأمر.", Toast.LENGTH_SHORT).show();
        }
    }
}
