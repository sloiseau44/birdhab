package com.birdhab.auth.domain.repository;

import com.birdhab.auth.domain.entity.Role;
import com.birdhab.auth.domain.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux données pour {@link Role}.
 */
public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(RoleName name);
}
