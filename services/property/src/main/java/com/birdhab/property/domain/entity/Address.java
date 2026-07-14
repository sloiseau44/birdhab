package com.birdhab.property.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Adresse postale d'un bien (France uniquement pour le MVP).
 */
@Embeddable
public class Address {

    @Column(name = "street", nullable = false, length = 255)
    private String street;

    @Column(name = "postal_code", nullable = false, length = 5)
    private String postalCode;

    @Column(name = "city", nullable = false, length = 100)
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
