package com.group1;

import javafx.animation.PauseTransition;
import javafx.application.Application;
import javafx.application.Preloader;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.stage.Screen;
import javafx.stage.Stage;
import javafx.util.Duration;

public class App extends Application {
    
    // Custom notification class
    public static class HideSplashEvent implements Preloader.PreloaderNotification {}

    @Override
    public void init() throws Exception {
    }

    @Override
    public void start(Stage stage) {
        // We no longer rely on this callback to show the app. 
        // It will just print a success message to the console if it manages to load.
        QuantumFrame mainFrame = new QuantumFrame(stage, () -> {
            System.out.println("SUCCESS: Home view finished its background load.");
        }); 

        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
        Scene scene = new Scene(mainFrame, screenBounds.getWidth(), screenBounds.getHeight() - 30);

        stage.setScene(scene);
        stage.setTitle("QuantumTick");

        // ABSOLUTE TIMEOUT: Force the splash screen to close after 2 seconds,
        // no matter what the WebViews are doing in the background.
        PauseTransition absoluteTimeout = new PauseTransition(Duration.seconds(2));
        
        absoluteTimeout.setOnFinished(event -> {
            stage.show();
            // Fire the explicit custom event to close the splash screen
            notifyPreloader(new HideSplashEvent());
        });
        
        absoluteTimeout.play();
    }

    public static void main(String[] args) {
        launch(args);
    }
}