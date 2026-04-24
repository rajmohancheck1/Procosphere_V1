package com.cts.mfrp.procuresphere.controller;

import com.cts.mfrp.procuresphere.dto.request.OrderRequest;
import com.cts.mfrp.procuresphere.dto.response.ApiResponse;
import com.cts.mfrp.procuresphere.dto.response.OrderResponse;
import com.cts.mfrp.procuresphere.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order creation and management")
@SecurityRequirement(name = "bearerAuth")
public class ProcurementOrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Get all orders with optional status filter")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getAllOrders(status)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderById(id)));
    }

    @PostMapping
    @Operation(summary = "Create a new order")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody OrderRequest request,
            Authentication authentication) {
        OrderResponse response = orderService.createOrder(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an order")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody OrderRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Order updated",
                orderService.updateOrder(id, request, authentication.getName())));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update order status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(ApiResponse.success("Order status updated",
                orderService.updateOrderStatus(id, status)));
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve order (Admin/Manager only)")
    public ResponseEntity<ApiResponse<OrderResponse>> approveOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order approved",
                orderService.updateOrderStatus(id, "APPROVED")));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject order (Admin/Manager only)")
    public ResponseEntity<ApiResponse<OrderResponse>> rejectOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order rejected",
                orderService.updateOrderStatus(id, "REJECTED")));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an order")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Order deleted", null));
    }
}
