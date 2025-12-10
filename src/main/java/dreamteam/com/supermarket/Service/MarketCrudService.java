package dreamteam.com.supermarket.Service;

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
import dreamteam.com.supermarket.repository.MarketProcedureDao;
import dreamteam.com.supermarket.repository.LocationProcedureDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
@Service
@RequiredArgsConstructor
public class MarketCrudService {

    private final MarketProcedureDao marketDao;
    private final LocationProcedureDao locationDao;

    public List<MarketSupermarketDto> listSupermarkets() {
        return marketDao.listSupermarket().stream()
                .map(this::mapSupermarket)
                .toList();
    }

    public List<MarketMestoDto> listMesta() {
        return locationDao.listMesta().stream()
                .map(row -> new MarketMestoDto(row.psc(), row.nazev(), row.kraj()))
                .toList();
    }

    public MarketSupermarketDto saveSupermarket(UpsertSupermarketRequest request) {
        Long generatedId = marketDao.saveSupermarket(
                request.id(),
                request.nazev(),
                request.telefon(),
                request.email(),
                request.adresaId(),
                request.adresaUlice(),
                request.adresaCpop(),
                request.adresaCorient(),
                request.adresaPsc()
        );
        return requireSupermarket(generatedId != null ? generatedId : request.id());
    }

    public void deleteSupermarket(Long id) {
        marketDao.deleteSupermarket(id);
    }

    public List<MarketWarehouseDto> listWarehouses() {
        return marketDao.listSklady().stream()
                .map(this::mapWarehouse)
                .toList();
    }

    public MarketWarehouseDto saveWarehouse(UpsertWarehouseRequest request) {
        Long generatedId = marketDao.saveSklad(
                request.id(),
                request.nazev(),
                request.kapacita(),
                request.telefon(),
                request.supermarketId()
        );
        return requireWarehouse(generatedId != null ? generatedId : request.id());
    }

    public void deleteWarehouse(Long id) {
        marketDao.deleteSklad(id);
    }

    public List<MarketGoodsDto> listGoods() {
        return marketDao.listZbozi().stream()
                .map(this::mapGoods)
                .toList();
    }

    public MarketGoodsDto saveGoods(UpsertGoodsRequest request) {
        Long generatedId = marketDao.saveZbozi(
                request.id(),
                request.nazev(),
                request.popis(),
                request.cena(),
                request.mnozstvi(),
                request.minMnozstvi(),
                request.kategorieId(),
                request.skladId()
        );
        return requireGoods(generatedId != null ? generatedId : request.id());
    }

    public void deleteGoods(Long id) {
        marketDao.deleteZbozi(id);
    }

    public List<MarketCategoryDto> listCategories() {
        return marketDao.listKategorie().stream()
                .map(row -> new MarketCategoryDto(row.id(), row.nazev(), row.popis()))
                .toList();
    }

    public MarketSupermarketDeleteInfoDto getSupermarketDeleteInfo(Long id) {
        var info = marketDao.getSupermarketDeleteInfo(id);
        if (info == null) {
            return null;
        }
        return new MarketSupermarketDeleteInfoDto(
                info.nazev(),
                info.skladCount(),
                info.zboziCount(),
                info.dodavatelCount()
        );
    }

    public MarketWarehouseDeleteInfoDto getWarehouseDeleteInfo(Long id) {
        var info = marketDao.getSkladDeleteInfo(id);
        if (info == null) {
            return null;
        }
        return new MarketWarehouseDeleteInfoDto(
                info.nazev(),
                info.zboziCount(),
                info.dodavatelCount()
        );
    }

    private MarketSupermarketDto requireSupermarket(Long id) {
        if (id == null) {
            throw new IllegalStateException("Supermarket nebyl ulozen");
        }
        var row = marketDao.getSupermarket(id);
        if (row == null) {
            throw new IllegalStateException("Supermarket nebyl nalezen");
        }
        return mapSupermarket(row);
    }

    private MarketWarehouseDto requireWarehouse(Long id) {
        if (id == null) {
            throw new IllegalStateException("Sklad nebyl ulozen");
        }
        var row = marketDao.getSklad(id);
        if (row == null) {
            throw new IllegalStateException("Sklad nebyl nalezen");
        }
        return mapWarehouse(row);
    }

    private MarketGoodsDto requireGoods(Long id) {
        if (id == null) {
            throw new IllegalStateException("Zbozi nebylo ulozeno");
        }
        var row = marketDao.getZbozi(id);
        if (row == null) {
            throw new IllegalStateException("Zbozi nebylo nalezeno");
        }
        return mapGoods(row);
    }

    private MarketSupermarketDto mapSupermarket(MarketProcedureDao.SupermarketRow row) {
        return new MarketSupermarketDto(
                row.id(),
                row.nazev(),
                row.telefon(),
                row.email(),
                row.adresaId(),
                row.adresaText(),
                row.adresaUlice(),
                row.adresaCpop(),
                row.adresaCorient(),
                row.adresaPsc(),
                row.adresaMesto()
        );
    }

    private MarketWarehouseDto mapWarehouse(MarketProcedureDao.SkladRow row) {
        return new MarketWarehouseDto(
                row.id(),
                row.nazev(),
                row.kapacita(),
                row.telefon(),
                row.supermarketId(),
                row.supermarketNazev()
        );
    }

    private MarketGoodsDto mapGoods(MarketProcedureDao.ZboziRow row) {
        return new MarketGoodsDto(
                row.id(),
                row.nazev(),
                row.popis(),
                row.cena(),
                row.mnozstvi(),
                row.minMnozstvi(),
                row.kategorieId(),
                row.kategorieNazev(),
                row.skladId(),
                row.skladNazev(),
                row.supermarketId(),
                row.supermarketNazev(),
                row.dodavatelCnt(),
                row.dodavatelNazvy()
        );
    }
}
