import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class Dump {
    public static void main(String[] args) {
        try {
            Connection c = DriverManager.getConnection("jdbc:mysql://localhost:3306/secure_lms_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true", "root", "root");
            Statement s = c.createStatement();
            ResultSet rs = s.executeQuery("SELECT display_name, route_path FROM function_links");
            while(rs.next()) {
                System.out.println(rs.getString("display_name") + " -> " + rs.getString("route_path"));
            }
        } catch(Exception e) {
            e.printStackTrace();
        }
    }
}
