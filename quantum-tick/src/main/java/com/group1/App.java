package com.group1;

import java.awt.Font;

import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingConstants;
public class App {
    public static void main( String[] args ){
        createAndShowGUI();
    }

    private static void createAndShowGUI() {
        JFrame frame = new JFrame("QuantumTick - Test App");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 200);
        frame.setLocationRelativeTo(null); 

        JLabel label = new JLabel("QuantumTick is successfully running!", SwingConstants.CENTER);
        label.setFont(new Font("Arial", Font.BOLD, 16));
        
        frame.add(label);
        frame.setVisible(true);
    }

}
