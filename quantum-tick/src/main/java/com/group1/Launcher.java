package com.group1;

public class Launcher {
    public static void main(String[] args) {
        System.setProperty("javafx.preloader", SplashPreloader.class.getCanonicalName());
        
        App.main(args);
    }
}