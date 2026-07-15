package com.birdhab.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie que chaque microservice a bien une route configurée dans
 * {@code application.yml}, sans démarrer les services eux-mêmes (la Gateway
 * ne fait que router, voir {@link GatewayApplication}).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayRoutesTest {

    private static final Map<String, String> EXPECTED_ROUTES = Map.of(
            "auth-service", "http://localhost:8081",
            "property-service", "http://localhost:8082",
            "tenant-service", "http://localhost:8083",
            "lease-service", "http://localhost:8084",
            "payment-service", "http://localhost:8085",
            "document-service", "http://localhost:8086"
    );

    @Autowired
    private RouteLocator routeLocator;

    @Test
    void routes_configuredForEveryService() {
        List<Route> routes = routeLocator.getRoutes().collectList().block();

        assertThat(routes).extracting(Route::getId).containsExactlyInAnyOrderElementsOf(EXPECTED_ROUTES.keySet());

        for (Route route : routes) {
            assertThat(route.getUri().toString()).isEqualTo(EXPECTED_ROUTES.get(route.getId()));
        }
    }
}
