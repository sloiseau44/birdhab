package com.birdhab.tenant.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Fiche locataire d'un propriétaire.
 *
 * <p>{@code ownerId} référence l'identifiant d'un {@code User} du service
 * auth par simple convention applicative : aucune relation JPA ni contrainte
 * de clé étrangère SQL n'est établie vers ce service, chaque microservice
 * étant un contexte borné indépendant (voir CLAUDE.md).</p>
 *
 * <p>Les documents d'identité et le rattachement à un bail sont hors
 * périmètre de cette première version (voir CONTEXT.md).</p>
 */
@Entity
@Table(name = "tenants")
public class Tenant extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Embedded
    private Address address;

    protected Tenant() {
        // requis par JPA
    }

    public Tenant(UUID ownerId, String firstName, String lastName, String email, String phone, Address address) {
        this.ownerId = ownerId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }
}
