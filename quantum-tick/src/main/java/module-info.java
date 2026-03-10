module com.group1.quantumtick {
    requires javafx.controls;
    requires javafx.web;
    requires javafx.graphics;
    requires jdk.jsobject;
    requires javafx.fxml;
    requires java.desktop;
    requires javafx.base;      

    opens com.group1 to javafx.graphics, javafx.fxml, javafx.web;

    exports com.group1;
}