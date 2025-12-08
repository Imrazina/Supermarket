package dreamteam.com.supermarket.controller.dto;

import java.util.List;

public record DashboardResponse(
        String syncUpdatedAt,
        List<WeeklyDemandPoint> weeklyDemand,
        List<InventoryItem> inventory,
        List<CategoryStat> categories,
        List<WarehouseInfo> warehouses,
        List<OrderInfo> orders,
        List<OrderLine> orderItems,
        List<StatusInfo> statuses,
        List<EmployeeInfo> employees,
        List<CustomerInfo> customers,
        List<SupplierInfo> suppliers,
        List<RoleInfo> roles,
        List<AddressInfo> addresses,
        List<PaymentInfo> payments,
        List<LogInfo> logs,
        List<MessageInfo> messages,
        long unreadMessages,
        String lastMessageSummary,
        List<SubscriberInfo> subscribers,
        List<StoreInfo> stores,
        Profile profile,
        List<FolderInfo> folders,
        List<CustomerProduct> customerProducts,
        List<String> customerSuggestions,
        List<ArchiveNode> archiveTree
) {

    public record WeeklyDemandPoint(String label, long value) {}

    public record InventoryItem(
            String sku,
            String name,
            String category,
            String warehouse,
            String supermarket,
            String supplier,
            long stock,
            long minStock,
            String leadTime,
            String status
    ) {}

    public record CategoryStat(String name, long assortment, String turnover, String manager) {}

    public record WarehouseInfo(String id, String name, long capacity, int used, String contact) {}

    public record OrderInfo(
            String id,
            String type,
            String store,
            String employee,
            String supplier,
            String status,
            String statusCode,
            String date,
            double amount,
            String priority,
            String note
    ) {}

    public record OrderLine(String orderId, String sku, String name, long qty, double price) {}

    public record StatusInfo(String code, String label, long count) {}

    public record EmployeeInfo(
            String id,
            String name,
            String position,
            String start,
            double mzda,
            String phone,
            String role
    ) {}

    public record CustomerInfo(String id, String name, String loyalty, String email, String phone) {}

    public record SupplierInfo(String id, String company, String contact, String phone, String rating) {}

    public record RoleInfo(String name, String description, long count) {}

    public record AddressInfo(String store, String city, String street, String zip, String kraj) {}

    public record PaymentInfo(
            String id,
            String orderId,
            String type,
            String method,
            double amount,
            String date,
            String status,
            boolean receipt
    ) {}

    public record LogInfo(String table, String operation, String user, String timestamp, String descr) {}

    public record MessageInfo(String sender, String receiver, String preview, String date) {}

    public record SubscriberInfo(String endpoint, String auth, String updated) {}

    public record StoreInfo(String name, String city, String address, String warehouse, String manager, String status) {}

    public record FolderInfo(String name, String color, List<FileInfo> files) {}

    public record FileInfo(String name, String type, String archive, String owner, String updated) {}

    public record ArchiveNode(Long id, String name, Long parentId, int level, String path) {}

    public record CustomerProduct(
            String sku,
            String name,
            String category,
            double price,
            String badge,
            String description,
            String image
    ) {}

    public record Profile(
            String firstName,
            String lastName,
            String fullName,
            String position,
            String role,
            String group,
            String email,
            String phone,
            String location,
            String timezone,
            String lastLogin,
            long storesOwned,
            long approvals,
            long escalations,
            long automations,
            List<String> permissions,
            Preferences preferences,
            Security security,
            List<Activity> activity,
            AddressDetails address,
            EmploymentDetails employment,
            CustomerDetails customer,
            SupplierDetails supplier
    ) {
        public record Preferences(String language, String theme, String notifications, boolean weeklyDigest) {}
        public record Security(String mfa, String devices, String lastIp) {}
        public record Activity(String time, String text, String status) {}
        public record AddressDetails(String street, String houseNumber, String orientationNumber, String city, String psc) {}
        public record EmploymentDetails(String position, double salary, String hireDate) {}
        public record CustomerDetails(String loyaltyCard) {}
        public record SupplierDetails(String company) {}
    }
}
