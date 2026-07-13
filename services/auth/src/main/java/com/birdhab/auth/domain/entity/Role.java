package com.birdhab.auth.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * Rôle applicatif attribuable à un {@link User}.
 *
 * <p>Modélisé en table séparée (plutôt qu'un simple enum sur {@code User})
 * pour permettre une extension RBAC plus fine côté Enterprise sans
 * migration de schéma lourde.</p>
 */
@Entity
@Table(name = "roles")
public class Role extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private RoleName name;

    protected Role() {
        // requis par JPA
    }

    public Role(RoleName name) {
        this.name = name;
    }

    public RoleName getName() {
        return name;
    }
}