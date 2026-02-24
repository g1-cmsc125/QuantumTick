package com.group1;

import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import netscape.javascript.JSObject;

public class QuantumFrame extends StackPane {

    public QuantumFrame() {
        WebView webView = new WebView();
        
        // 1. Set up the Javascript Bridge
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                window.setMember("javaApp", new QuantumBridge(webView.getEngine()));
            }
        });

        // 2. Load the HTML file
        webView.getEngine().load(getClass().getResource("/index.html").toExternalForm());

        // 3. Add the WebView to this StackPane layout
        this.getChildren().add(webView);
    }
}