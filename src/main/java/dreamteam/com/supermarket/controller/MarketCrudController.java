package dreamteam.com.supermarket.controller;

import dreamteam.com.supermarket.Service.MarketCrudService;
import dreamteam.com.supermarket.controller.dto.market.MarketCategoryDto;
import dreamteam.com.supermarket.controller.dto.market.MarketGoodsDto;
import dreamteam.com.supermarket.controller.dto.market.MarketMestoDto;
import dreamteam.com.supermarket.controller.dto.market.MarketSupermarketDeleteInfoDto;
import dreamteam.com.supermarket.controller.dto.market.MarketSupermarketDto;
import dreamteam.com.supermarket.controller.dto.market.MarketWarehouseDeleteInfoDto;
import dreamteam.com.supermarket.controller.dto.market.MarketWarehouseDto;
import dreamteam.com.supermarket.controller.dto.market.UpsertGoodsRequest;
import dreamteam.com.supermarket.controller.dto.market.UpsertSupermarketRequest;
import dreamteam.com.supermarket.controller.dto.market.UpsertWarehouseRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@CrossOrigin(origins = "http://localhost:8000", allowCredentials = "true")
public class MarketCrudController {

    private final MarketCrudService marketCrudService;

    public MarketCrudController(MarketCrudService marketCrudService) {
        this.marketCrudService = marketCrudService;
    }

    @GetMapping("/supermarkets")
    public List<MarketSupermarketDto> listSupermarkets() {
        return marketCrudService.listSupermarkets();
    }

    @PostMapping("/supermarkets")
    public MarketSupermarketDto upsertSupermarket(@Valid @RequestBody UpsertSupermarketRequest request) {
        return marketCrudService.saveSupermarket(request);
    }

    @DeleteMapping("/supermarkets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSupermarket(@PathVariable Long id) {
        marketCrudService.deleteSupermarket(id);
    }

    @GetMapping("/warehouses")
    public List<MarketWarehouseDto> listWarehouses() {
        return marketCrudService.listWarehouses();
    }

    @PostMapping("/warehouses")
    public MarketWarehouseDto upsertWarehouse(@Valid @RequestBody UpsertWarehouseRequest request) {
        return marketCrudService.saveWarehouse(request);
    }

    @DeleteMapping("/warehouses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWarehouse(@PathVariable Long id) {
        marketCrudService.deleteWarehouse(id);
    }

    @GetMapping("/goods")
    public List<MarketGoodsDto> listGoods() {
        return marketCrudService.listGoods();
    }

    @PostMapping("/goods")
    public MarketGoodsDto upsertGoods(@Valid @RequestBody UpsertGoodsRequest request) {
        return marketCrudService.saveGoods(request);
    }

    @DeleteMapping("/goods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGoods(@PathVariable Long id) {
        marketCrudService.deleteGoods(id);
    }

    @GetMapping("/categories")
    public List<MarketCategoryDto> listCategories() {
        return marketCrudService.listCategories();
    }

    @GetMapping("/mesta")
    public List<MarketMestoDto> listCities() {
        return marketCrudService.listMesta();
    }

    @GetMapping("/supermarkets/{id}/delete-info")
    public MarketSupermarketDeleteInfoDto getSupermarketDeleteInfo(@PathVariable Long id) {
        var info = marketCrudService.getSupermarketDeleteInfo(id);
        if (info == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Supermarket nebyl nalezen");
        }
        return info;
    }

    @GetMapping("/warehouses/{id}/delete-info")
    public MarketWarehouseDeleteInfoDto getWarehouseDeleteInfo(@PathVariable Long id) {
        var info = marketCrudService.getWarehouseDeleteInfo(id);
        if (info == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sklad nebyl nalezen");
        }
        return info;
    }
}
