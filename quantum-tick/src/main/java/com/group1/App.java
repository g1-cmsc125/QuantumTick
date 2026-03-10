package com.group1;

import javafx.application.Application;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.stage.Screen;
import javafx.stage.Stage;

public class App extends Application {

    @Override
    public void start(Stage stage) {
        QuantumFrame mainFrame = new QuantumFrame(stage); 

        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
        Scene scene = new Scene(mainFrame, screenBounds.getWidth(), screenBounds.getHeight() - 30);

        stage.setScene(scene);
        stage.setTitle("QuantumTick");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}