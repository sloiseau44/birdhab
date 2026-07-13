package com.birdhab.auth.domain.entity;

/**
 * Noms de rôles applicatifs disponibles dans Birdhab.
 *
 * <p>{@code OWNER} est attribué par défaut à tout nouveau compte (le
 * propriétaire bailleur, cible unique en MVP). {@code ADMIN} est réservé
 * à une future extension Enterprise (gestion multi-utilisateurs, SSO/LDAP).
 * {@code TENANT} est réservé à une future évolution (v2+, hors MVP) permettant
 * à un locataire de disposer d'un compte pour accéder à son espace (documents,
 * messagerie avec son propriétaire) — voir CONTEXT.md, section "Hors MVP".</p>
 */
public enum RoleName {
    OWNER,
    ADMIN,
    TENANT
}