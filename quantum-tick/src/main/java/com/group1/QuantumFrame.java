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

    public QuantumFrame(Stage stage, Runnable onReady) {
        bridge = new QuantumBridge(this, stage);
        
        // EAGER LOADING: Initialize all views immediately. 
        homeView = createWebView("/index.html", onReady);
        hiwView = createWebView("/pages/hiw.html", null);
        startView = createWebView("/pages/start.html", null);

        // Add them all to the StackPane
        this.getChildren().addAll(startView, hiwView, homeView);
        
        // Hide the ones we don't need right away
        startView.setVisible(false);
        hiwView.setVisible(false);
        homeView.setVisible(true);
    }

    private WebView createWebView(String path, Runnable onReady) {
        WebView webView = new WebView();
        // A flag to ensure we only trigger the ready state once
        final boolean[] isReadyFired = {false}; 
        
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            // DEBUG: This will print to your console so you can see exactly what is loading
            System.out.println("Loading " + path + ": " + newState);

            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                window.setMember("javaApp", bridge);
                
                if (onReady != null && !isReadyFired[0]) {
                    isReadyFired[0] = true;
                    onReady.run();
                }
            } else if (newState == Worker.State.FAILED || newState == Worker.State.CANCELLED) {
                System.err.println("ERROR: WebView failed to load " + path);
                
                // FAILSAFE: Force the app to open anyway so you aren't stuck on the splash screen!
                if (onReady != null && !isReadyFired[0]) {
                    isReadyFired[0] = true;
                    onReady.run();
                }
            }
        });
        
        java.net.URL resource = getClass().getResource(path);
        if (resource != null) {
            webView.getEngine().load(resource.toExternalForm());
        } else {
            System.err.println("CRITICAL ERROR: Could not find " + path);
            
            // FAILSAFE: Force the app to open if the file path is wrong!
            if (onReady != null && !isReadyFired[0]) {
                isReadyFired[0] = true;
                onReady.run();
            }
        }
        
        return webView;
    }

    public void switchView(String viewName) {
        // Hide all views first
        homeView.setVisible(false);
        hiwView.setVisible(false);
        startView.setVisible(false);

        // Instantly toggle visibility and bring to front
        switch (viewName) {
            case "home":  
                homeView.setVisible(true);  
                homeView.toFront();  
                break;
            case "hiw":   
                hiwView.setVisible(true);   
                hiwView.toFront();   
                break;
            case "start": 
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