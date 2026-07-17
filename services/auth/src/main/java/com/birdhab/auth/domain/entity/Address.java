package com.birdhab.auth.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Adresse postale du propriétaire (France uniquement pour le MVP), utilisée
 * comme adresse du bailleur lors de la génération d'une quittance par le
 * service {@code payment} (voir {@code docs/api/payment.yml}).
 *
 * <p>Toutes les colonnes sont nullable : un utilisateur n'a pas forcément
 * renseigné son adresse (absente à l'inscription, ajoutée via
 * {@code PUT /auth/me}). Si toutes les colonnes sont nulles, Hibernate
 * restitue {@code null} pour le champ {@code address} de {@link User}
 * plutôt qu'une instance aux champs vides.</p>
 */
@Embeddable
public class Address {

    @Column(name = "street", length = 255)
    private String street;

    @Column(name = "postal_code", length = 5)
    private String postalCode;

    @Column(name = "city", length = 100)
    private String city;

    protected Address() {
        // requis par JPA
    }

    public Address(String street, String postalCode, String city) {
        this.street = street;
        this.postalCode = postalCode;
        this.city = city;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }
}
