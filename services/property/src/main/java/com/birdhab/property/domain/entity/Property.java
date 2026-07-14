package com.birdhab.property.domain.entity;

import com.birdhab.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Bien immobilier géré par un propriétaire.
 *
 * <p>{@code ownerId} référence l'identifiant d'un {@code User} du service
 * auth par simple convention applicative : aucune relation JPA ni contrainte
 * de clé étrangère SQL n'est établie vers ce service, chaque microservice
 * étant un contexte borné indépendant (voir CLAUDE.md).</p>
 */
@Entity
@Table(name = "properties")
public class Property extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Embedded
    private Address address;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PropertyType type;

    @Column(name = "surface", nullable = false)
    private BigDecimal surface;

    @Column(name = "reference_rent", nullable = false)
    private BigDecimal referenceRent;

    protected Property() {
        // requis par JPA
    }

    public Property(UUID ownerId, Address address, PropertyType type, BigDecimal surface, BigDecimal referenceRent) {
        this.ownerId = ownerId;
        this.address = address;
        this.type = type;
        this.surface = surface;
        this.referenceRent = referenceRent;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    public PropertyType getType() {
        return type;
    }

    public void setType(PropertyType type) {
        this.type = type;
    }

    public BigDecimal getSurface() {
        return surface;
    }

    public void setSurface(BigDecimal surface) {
        this.surface = surface;
    }

    public BigDecimal getReferenceRent() {
        return referenceRent;
    }

    public void setReferenceRent(BigDecimal referenceRent) {
        this.referenceRent = referenceRent;
    }
}
