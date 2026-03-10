package com.group1;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import javafx.stage.FileChooser;
import javafx.stage.Stage;

public class QuantumBridge {
    private QuantumFrame frame;
    private Stage stage;

    public QuantumBridge(QuantumFrame frame, Stage stage) {
        this.frame = frame;
        this.stage = stage;
    }

    // Called by JavaScript to change pages instantly
    public void navigate(String viewName) {
        frame.switchView(viewName);
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

            // Execute the CSV parser specifically on the Start page's engine
            frame.executeOnStartView("parseCSV(`" + escaped + "`)");

        } catch (IOException e) {
            frame.executeOnStartView("alert('Failed to read file: " + e.getMessage() + "')");
        }
    }
}