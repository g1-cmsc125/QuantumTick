package com.group1;

import java.time.LocalTime;
import java.util.Random;

import javafx.scene.web.WebEngine;

public class QuantumBridge {
    private WebEngine engine;

    // Constructor gets the engine from App.java
    public QuantumBridge(WebEngine engine) {
        this.engine = engine;
    }

    // This must match the name used in the HTML onclick="javaApp.runTest()"
    public void runTest() {
        System.out.println("Button clicked! Java is processing...");

        // 1. Do some "Java work"
        String currentTime = LocalTime.now().toString();
        int randomId = new Random().nextInt(9999);
        
        // 2. Format the message
        String finalMessage = "Java Connection Success! Time: " + currentTime + " | ID: " + randomId;

        // 3. Push it to the HTML!
        // We are telling the browser to run: changeText('Java Connection Success! ...');
        engine.executeScript("changeText('" + finalMessage + "');");
    }
}