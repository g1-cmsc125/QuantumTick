package com.group1;

import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class QuantumFrame extends StackPane {

    private QuantumBridge bridge;
    private WebView homeView;
    private WebView hiwView;
    private WebView startView;

    public QuantumFrame(Stage stage) {
        // Pass 'this' frame to the bridge so it can control the views
        bridge = new QuantumBridge(this, stage);

        // Load all pages simultaneously into memory
        homeView = createWebView("/index.html");
        hiwView = createWebView("/pages/hiw.html");
        startView = createWebView("/pages/start.html");

        // Hide the sub-pages, leaving only the home screen visible
        hiwView.setVisible(false);
        startView.setVisible(false);

        // Add them all to the screen
        this.getChildren().addAll(startView, hiwView, homeView);
    }

    private WebView createWebView(String path) {
        WebView webView = new WebView();
        
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                window.setMember("javaApp", bridge);
            }
        });
        
        java.net.URL resource = getClass().getResource(path);
        if (resource != null) {
            webView.getEngine().load(resource.toExternalForm());
        } else {
            System.err.println("CRITICAL ERROR: Could not find " + path);
        }
        
        return webView;
    }

    // Method to instantly swap which pre-loaded page is visible
    public void switchView(String viewName) {
        homeView.setVisible(false);
        hiwView.setVisible(false);
        startView.setVisible(false);

        switch (viewName) {
            case "home":  homeView.setVisible(true);  homeView.toFront();  break;
            case "hiw":   hiwView.setVisible(true);   hiwView.toFront();   break;
            case "start": startView.setVisible(true); startView.toFront(); break;
        }
    }

    // Allows the bridge to send data specifically to the Simulation page
    public void executeOnStartView(String script) {
        startView.getEngine().executeScript(script);
    }
}