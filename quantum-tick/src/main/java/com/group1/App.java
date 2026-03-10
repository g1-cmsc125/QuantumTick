package com.group1;

import java.awt.SplashScreen;

import javafx.application.Application;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.stage.Screen;
import javafx.stage.Stage;


public class App extends Application {
    @Override
    public void init() throws Exception {
        Thread.sleep(3000); 
    }

    @Override
    public void start(Stage stage) {
        QuantumFrame mainFrame = new QuantumFrame(stage); 

        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
        Scene scene = new Scene(mainFrame, screenBounds.getWidth(), screenBounds.getHeight() - 30);

        stage.setScene(scene);
        stage.setTitle("QuantumTick");
        stage.show();

        SplashScreen splash = SplashScreen.getSplashScreen();
        if (splash != null && splash.isVisible()) {
            splash.close();
        }

        
    }

    public static void main(String[] args) {
        launch(args);
    }
}