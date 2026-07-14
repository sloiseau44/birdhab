package com.birdhab.tenant.domain.service;

import com.birdhab.tenant.domain.entity.Address;
import com.birdhab.tenant.domain.entity.Tenant;
import com.birdhab.tenant.domain.exception.TenantNotFoundException;
import com.birdhab.tenant.domain.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Logique métier de la gestion des locataires : création, consultation,
 * modification et suppression, toujours scopées au propriétaire authentifié.
 */
@Service
@Transactional
public class TenantService {

    private final TenantRepository tenantRepository;

    public TenantService(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    public Tenant create(UUID ownerId, String firstName, String lastName, String email,
                          String phone, Address address) {
        Tenant tenant = new Tenant(ownerId, firstName, lastName, email, phone, address);
        return tenantRepository.save(tenant);
    }

    @Transactional(readOnly = true)
    public List<Tenant> listForOwner(UUID ownerId) {
        return tenantRepository.findByOwnerId(ownerId);
    }

    /**
     * @throws TenantNotFoundException si le locataire n'existe pas ou n'appartient pas à {@code ownerId}
     */
    @Transactional(readOnly = true)
    public Tenant getForOwner(UUID id, UUID ownerId) {
        return tenantRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(TenantNotFoundException::new);
    }

    /**
     * @throws TenantNotFoundException si le locataire n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public Tenant update(UUID id, UUID ownerId, String firstName, String lastName, String email,
                          String phone, Address address) {
        Tenant tenant = getForOwner(id, ownerId);
        tenant.setFirstName(firstName);
        tenant.setLastName(lastName);
        tenant.setEmail(email);
        tenant.setPhone(phone);
        tenant.setAddress(address);
        return tenantRepository.save(tenant);
    }

    /**
     * @throws TenantNotFoundException si le locataire n'existe pas ou n'appartient pas à {@code ownerId}
     */
    public void delete(UUID id, UUID ownerId) {
        Tenant tenant = getForOwner(id, ownerId);
        tenantRepository.delete(tenant);
    }
}
