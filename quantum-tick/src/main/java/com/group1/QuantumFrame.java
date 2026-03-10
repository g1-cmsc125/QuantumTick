package com.group1;

import javafx.concurrent.Worker;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class QuantumFrame extends StackPane {

    // Strong reference — prevents JVM from garbage collecting the bridge
    // after the first JS call completes. Without this, javaApp becomes null
    // on the JS side after first use, silently dropping subsequent calls.
    private QuantumBridge bridge;

    public QuantumFrame(Stage stage) {
        WebView webView = new WebView();

        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                bridge = new QuantumBridge(webView.getEngine(), stage);
                window.setMember("javaApp", bridge);
            }
        });

        webView.getEngine().load(getClass().getResource("/index.html").toExternalForm());
        this.getChildren().add(webView);
    }
}