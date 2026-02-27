package com.group1;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalTime;
import java.util.Random;

import javafx.scene.web.WebEngine;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

public class QuantumBridge {
    private WebEngine engine;
    private Stage stage;

    public QuantumBridge(WebEngine engine, Stage stage) {
        this.engine = engine;
        this.stage  = stage;
    }

    public void runTest() {
        System.out.println("Button clicked! Java is processing...");
        String currentTime = LocalTime.now().toString();
        int randomId = new Random().nextInt(9999);
        String finalMessage = "Java Connection Success! Time: " + currentTime + " | ID: " + randomId;
        engine.executeScript("changeText('" + finalMessage + "');");
    }

    public void openFilePicker() {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Upload Process CSV");
        chooser.getExtensionFilters().add(
            new FileChooser.ExtensionFilter("CSV Files", "*.csv")
        );

        File file = chooser.showOpenDialog(stage);
        if (file == null) return;

        try {
            String content = Files.readString(file.toPath());

            String escaped = content
                .replace("\\", "\\\\")
                .replace("`", "\\`")
                .replace("$", "\\$");

            engine.executeScript("parseCSV(`" + escaped + "`)");

        } catch (IOException e) {
            engine.executeScript("alert('Failed to read file: " + e.getMessage() + "')");
        }
    }
}