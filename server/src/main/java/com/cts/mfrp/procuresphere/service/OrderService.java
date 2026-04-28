package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.OrderRequest;
import com.cts.mfrp.procuresphere.dto.response.OrderItemResponse;
import com.cts.mfrp.procuresphere.dto.response.OrderResponse;
import com.cts.mfrp.procuresphere.exception.BadRequestException;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.Order;
import com.cts.mfrp.procuresphere.model.OrderItem;
import com.cts.mfrp.procuresphere.model.Product;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.OrderRepository;
import com.cts.mfrp.procuresphere.repository.ProductRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders(String status) {
        List<Order> orders = (status != null && !status.isBlank())
                ? orderRepository.findByStatus(status)
                : orderRepository.findAll();
        return orders.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        return toResponse(orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id)));
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Order order = Order.builder()
                .createdBy(user)
                .supplierId(request.getSupplierId())
                .orderTitle(request.getOrderTitle())
                .department(request.getDepartment())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .paymentMethod(request.getPaymentMethod())
                .budgetCode(request.getBudgetCode())
                .expectedDelivery(request.getExpectedDelivery())
                .status(request.getStatus() != null ? request.getStatus() : "PENDING")
                .items(new ArrayList<>())
                .build();

        float total = 0f;
        for (var itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + itemReq.getProductId()));

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .price(itemReq.getPrice())
                    .build();
            order.getItems().add(item);
            total += (itemReq.getPrice() != null ? itemReq.getPrice() : 0f) * itemReq.getQuantity();
        }
        order.setTotalAmount(total);

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        String oldStatus = order.getStatus();
        String newStatus = status != null ? status.toUpperCase() : oldStatus;

        // Stock adjustment side-effects on status transitions:
        //  - APPROVED (from non-stock-deducting state) → decrement stock for each item
        //  - CANCELLED / RETURNED / REJECTED (from APPROVED/ORDERED/RECEIVED) → restore stock
        boolean wasDeducted = isStockDeductedState(oldStatus);
        boolean willBeDeducted = isStockDeductedState(newStatus);

        if (!wasDeducted && willBeDeducted) {
            adjustStock(order, -1);
        } else if (wasDeducted && !willBeDeducted) {
            adjustStock(order, +1);
        }

        order.setStatus(newStatus);
        return toResponse(orderRepository.save(order));
    }

    /** States in which the order's items are considered "consumed" from inventory. */
    private boolean isStockDeductedState(String status) {
        if (status == null) return false;
        return switch (status.toUpperCase()) {
            case "APPROVED", "ORDERED", "RECEIVED" -> true;
            default -> false;
        };
    }

    /**
     * Adjusts stock for every item in the order. direction = -1 to deduct,
     * +1 to restore. Caps at 0 (never goes negative) and toggles isInStock.
     */
    private void adjustStock(Order order, int direction) {
        if (order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            Product p = item.getProduct();
            if (p == null) continue;
            int current = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int delta = direction * item.getQuantity();
            int next = Math.max(0, current + delta);
            p.setStockQuantity(next);
            p.setIsInStock(next > 0);
            productRepository.save(p);
        }
    }

    @Transactional
    public OrderResponse updateOrder(Long id, OrderRequest request, String userEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (request.getOrderTitle() != null) order.setOrderTitle(request.getOrderTitle());
        if (request.getDepartment() != null) order.setDepartment(request.getDepartment());
        if (request.getPriority() != null) order.setPriority(request.getPriority());
        if (request.getPaymentMethod() != null) order.setPaymentMethod(request.getPaymentMethod());
        if (request.getBudgetCode() != null) order.setBudgetCode(request.getBudgetCode());
        if (request.getExpectedDelivery() != null) order.setExpectedDelivery(request.getExpectedDelivery());
        if (request.getStatus() != null) order.setStatus(request.getStatus());
        if (request.getSupplierId() != null) order.setSupplierId(request.getSupplierId());

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with id: " + id);
        }
        orderRepository.deleteById(id);
    }

    private OrderResponse toResponse(Order o) {
        String supplierName = null;
        if (o.getSupplierId() != null) {
            supplierName = userRepository.findById(o.getSupplierId().longValue())
                    .map(u -> {
                        String full = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                                     + (u.getLastName()  == null ? "" : u.getLastName())).trim();
                        return full.isEmpty() ? u.getEmail() : full;
                    })
                    .orElse(null);
        }
        List<OrderItemResponse> itemResponses = o.getItems() != null
                ? o.getItems().stream().map(i -> OrderItemResponse.builder()
                        .orderItemId(i.getOrderItemId())
                        .productId(i.getProduct() != null ? i.getProduct().getProductId() : null)
                        .productName(i.getProduct() != null ? i.getProduct().getProductName() : null)
                        .quantity(i.getQuantity())
                        .price(i.getPrice())
                        .build()).collect(Collectors.toList())
                : List.of();

        return OrderResponse.builder()
                .orderId(o.getOrderId())
                .createdBy(o.getCreatedBy() != null ? o.getCreatedBy().getUserId() : null)
                .createdByName(o.getCreatedBy() != null ?
                        o.getCreatedBy().getFirstName() + " " + o.getCreatedBy().getLastName() : null)
                .supplierId(o.getSupplierId())
                .supplierName(supplierName)
                .orderTitle(o.getOrderTitle())
                .department(o.getDepartment())
                .priority(o.getPriority())
                .paymentMethod(o.getPaymentMethod())
                .budgetCode(o.getBudgetCode())
                .expectedDelivery(o.getExpectedDelivery())
                .status(o.getStatus())
                .totalAmount(o.getTotalAmount())
                .createdAt(o.getCreatedAt())
                .items(itemResponses)
                .build();

    }
}
