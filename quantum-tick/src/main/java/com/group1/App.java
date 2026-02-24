package com.group1;

import javafx.application.Application;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class App extends Application {

    @Override
    public void start(Stage stage) {
        WebView webView = new WebView();
        
        // Re-inject the bridge every time the page loads or changes
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                // Pass the engine to the bridge so it can send messages back!
                window.setMember("javaApp", new QuantumBridge(webView.getEngine()));
            }
        });

        // Load the main page
        webView.getEngine().load(getClass().getResource("/index.html").toExternalForm());

        Scene scene = new Scene(webView, 800, 600);
        stage.setScene(scene);
        stage.setTitle("QuantumTick");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}