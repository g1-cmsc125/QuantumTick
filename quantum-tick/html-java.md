# 🚀 Building Modern Desktop Apps with JavaFX WebView & HTML/CSS

This guide explains how to build a desktop application using **JavaFX** as the native window wrapper, but using **HTML, CSS, and JavaScript** for the User Interface. 

By using JavaFX `WebView`, we get the best of both worlds:
1. Beautiful, modern web-based UI (CSS gradients, flexbox, animations).
2. Powerful Java backend (File I/O, multithreading, databases).



---

## 📁 1. Project Directory Structure
In Maven, files must be placed in specific folders. **Java code** and **Web resources** are kept strictly separate until the project is compiled.

```text
quantum-tick/
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   ├── module-info.java       <-- Java Modules setup
        │   └── com/group1/
        │       ├── App.java           <-- Main JavaFX setup
        │       ├── Launcher.java      <-- Bypass for Fat JAR/EXE
        │       └── QuantumBridge.java <-- Java/HTML Communication
        └── resources/
            ├── index.html             <-- Main UI
            ├── otherpages.html        <-- OtherScreen
            └── style.css              <-- Styling
```

---

## ⚙️ 2. The `pom.xml` Setup
We use Java 21 and JavaFX 21. The POM needs specific plugins to allow us to run the app during development, package it into a single `.jar`, and wrap it into a Windows `.exe`.

Key Plugins Used:
* **`javafx-maven-plugin`**: Allows running the app via terminal.
* **`maven-assembly-plugin`**: Bundles all dependencies into one "Fat JAR".
* **`launch4j-maven-plugin`**: Converts the Fat JAR into a native Windows `.exe`.

*(Note: Ensure your `mainClass` inside the Assembly and Launch4j plugins points to `com.group1.Launcher`, NOT `App`!)*

---

## 🔐 3. The Module System (`module-info.java`)
Because Java is modular, we must explicitly grant permission for our app to use JavaFX, the Web Engine, and the JavaScript bridge (`jdk.jsobject`).

```java
module com.group1.quantumtick {
    requires javafx.controls;
    requires javafx.web;
    requires javafx.graphics;
    requires jdk.jsobject; // Crucial for Java-to-HTML communication

    opens com.group1 to javafx.graphics, javafx.web;
    exports com.group1;
}
```

---

## 🌐 4. The Front-End (HTML & JS)
To call Java from HTML, use the `onclick` attribute to trigger a method on the `javaApp` object. To receive data, create a JS function that Java can "inject" strings into.

```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="style.css"></head>
<body>
    <h2 id="displayBox">Waiting for system...</h2>
    <button onclick="javaApp.runTask()">Run Java Task</button>

    <script>
        // This function will be triggered FROM Java
        function updateScreen(text) {
            document.getElementById("displayBox").innerText = text;
        }
    </script>
</body>
</html>
```

---

## 🧠 5. The Back-End (Java Bridge)
This class handles requests from HTML and pushes data back to the UI.

```java
package com.group1;
import javafx.scene.web.WebEngine;

public class QuantumBridge {
    private WebEngine engine;

    public QuantumBridge(WebEngine engine) {
        this.engine = engine;
    }

    // Method called by the HTML button
    public void runTask() {
        System.out.println("Java is running the task...");
        String data = "Task Complete! Data from Java.";
        
        // Push data back to HTML by executing the JS function
        engine.executeScript("updateScreen('" + data + "');");
    }
}
```

---

## 🚀 6. Bootstrapping the App

### A. The JavaFX App (`App.java`)
Loads the HTML file and injects the `QuantumBridge` object into the browser engine.

```java
package com.group1;
import javafx.application.Application;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

public class App extends Application {
    @Override
    public void start(Stage stage) {
        WebView webView = new WebView();
        webView.getEngine().getLoadWorker().stateProperty().addListener((obs, old, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                JSObject window = (JSObject) webView.getEngine().executeScript("window");
                window.setMember("javaApp", new QuantumBridge(webView.getEngine()));
            }
        });
        webView.getEngine().load(getClass().getResource("/index.html").toExternalForm());
        stage.setScene(new Scene(webView, 800, 600));
        stage.show();
    }
    public static void main(String[] args) { launch(args); }
}
```

### B. The Launcher (`Launcher.java`)
Bypasses the JavaFX module check when running from a JAR or EXE.

```java
package com.group1;
public class Launcher {
    public static void main(String[] args) {
        App.main(args);
    }
}
```

---

## 🏃 7. Commands to Run & Build

**To run the app during development:**
```bash
mvn clean javafx:run
```

**To build the final `.exe` and `.jar`:**
```bash
mvn clean package
```
*The compiled `.exe` will be located inside the `target/` directory.*