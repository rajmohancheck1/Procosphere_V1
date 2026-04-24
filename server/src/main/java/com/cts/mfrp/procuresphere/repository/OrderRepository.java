package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(String status);
    List<Order> findByCreatedByUserId(Long userId);
    List<Order> findBySupplierId(Integer supplierId);
    long countByStatus(String status);
}
