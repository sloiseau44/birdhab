package com.birdhab.tenant.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Adresse postale d'un locataire (France uniquement pour le MVP). Optionnelle :
 * une fiche locataire peut exister sans adresse renseignée.
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
