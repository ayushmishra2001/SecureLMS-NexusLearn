package tech.csm.securelms.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import tech.csm.securelms.entity.User;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String email;
    private final String password;
    private final Long roleId;
    private final String role;
    private final String roleName;
    private final Long groupId;
    private final String groupName;
    private final boolean active;
    private final boolean accountNonLocked;

    private UserPrincipal(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.roleId = user.getRole() != null ? user.getRole().getId() : null;
        this.role = user.getRole() != null ? user.getRole().getCode() : null;
        this.roleName = user.getRole() != null ? user.getRole().getDisplayName() : null;
        this.groupId = user.getGroup() != null ? user.getGroup().getId() : null;
        this.groupName = user.getGroup() != null ? user.getGroup().getGroupName() : null;
        this.active = user.isActive();
        this.accountNonLocked = user.isAccountNonLocked();
    }

    public static UserPrincipal create(User user) {
        return new UserPrincipal(user);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof UserPrincipal other)) {
            return false;
        }
        return Objects.equals(this.id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }
}
