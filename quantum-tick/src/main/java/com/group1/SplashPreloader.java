package com.group1;

import javafx.application.Preloader;
import javafx.geometry.Rectangle2D;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.stage.Screen;
import javafx.stage.Stage;
import javafx.stage.StageStyle;

public class SplashPreloader extends Preloader {

    private Stage preloaderStage;

    @Override
    public void start(Stage primaryStage) {
        this.preloaderStage = primaryStage;
        Rectangle2D screenBounds = Screen.getPrimary().getVisualBounds();
        StackPane root = new StackPane();
        root.setStyle("-fx-background-color: #0b0710;");

        try {
            Image logo = new Image(getClass().getResourceAsStream("/images/splashScreen.gif"));
            ImageView logoView = new ImageView(logo);
            logoView.setFitWidth(screenBounds.getWidth());
            logoView.setPreserveRatio(true);
            root.getChildren().add(logoView);
        } catch (Exception e) {
            System.err.println("Could not load logo for splash screen: " + e.getMessage());
        }

        Scene scene = new Scene(root, screenBounds.getWidth(), screenBounds.getHeight(), Color.web("#0b0710"));
        primaryStage.initStyle(StageStyle.UNDECORATED);
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    @Override
    public void handleStateChangeNotification(StateChangeNotification info) {
        if (info.getType() == StateChangeNotification.Type.BEFORE_START) {
            preloaderStage.hide();
        }
    }
}