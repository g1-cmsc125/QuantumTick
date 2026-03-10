module com.group1.quantumtick {
    requires javafx.controls;
    requires javafx.web;
    requires javafx.graphics;
    requires jdk.jsobject;
    requires javafx.fxml;
    requires java.desktop;

    // "opens" allows JavaFX to see the resources inside this package
    opens com.group1 to javafx.graphics, javafx.fxml, javafx.web;

    exports com.group1;
}