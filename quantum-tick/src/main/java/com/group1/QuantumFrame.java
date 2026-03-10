package com.group1;

import javafx.application.Platform;
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
        bridge = new QuantumBridge(this, stage);
        
        // ONLY load the home view initially
        homeView = createWebView("/index.html");
        this.getChildren().add(homeView);
        
        // Removed Platform.runLater. We will lazy-load the other views instead.
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

    public void switchView(String viewName) {
        if (homeView != null) homeView.setVisible(false);
        if (hiwView != null) hiwView.setVisible(false);
        if (startView != null) startView.setVisible(false);

        switch (viewName) {
            case "home":  
                homeView.setVisible(true);  
                homeView.toFront();  
                break;
            case "hiw":   
                // Lazy Load: Create it only the first time it is needed
                if (hiwView == null) {
                    hiwView = createWebView("/pages/hiw.html");
                    this.getChildren().add(0, hiwView);
                }
                hiwView.setVisible(true);   
                hiwView.toFront();   
                break;
            case "start": 
                // Lazy Load: Create it only the first time it is needed
                if (startView == null) {
                    startView = createWebView("/pages/start.html");
                    this.getChildren().add(0, startView);
                }
                startView.setVisible(true); 
                startView.toFront(); 
                break;
        }
    }

    public void executeOnStartView(String script) {
        if (startView != null) {
            startView.getEngine().executeScript(script);
        }
    }
}