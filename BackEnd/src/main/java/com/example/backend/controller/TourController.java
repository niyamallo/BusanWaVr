package com.example.backend.controller;

import com.example.backend.dto.Response;
import com.example.backend.dto.tour.TourDetailDto;
import com.example.backend.dto.tour.TourLinkUpdateDto;
import com.example.backend.dto.tour.TourListDto;
import com.example.backend.dto.tour.TourRegistDto;
import com.example.backend.dto.tour.TourSearchInfoDto;
import com.example.backend.dto.tour.TourUpdateDto;
import com.example.backend.model.tour.qdto.SearchTourDto;
import com.example.backend.security.UserDetailsImpl;
import com.example.backend.service.tour.TourGetService;
import com.example.backend.service.tour.TourRegistService;
import com.example.backend.service.tour.TourSearchService;
import com.example.backend.service.tour.TourService;
import com.example.backend.service.tour.TourUpdateService;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TourController {

    private final TourService tourService;
    private final TourRegistService tourRegistService;
    private final TourGetService tourGetService;
    private final TourUpdateService tourUpdateService;
    private final TourSearchService tourSearchService;

    @PostMapping("/tour")
    public Response<TourRegistDto.Response> tourRegistApi(
            @ModelAttribute TourRegistDto.Request request,
            @AuthenticationPrincipal UserDetailsImpl userDetails)
            throws IllegalAccessException, IOException {
        if (request.getCourses().size() > 3) {
            throw new IllegalArgumentException("코스 개수는 4개 미만이여야 합니다.");
        }
        TourRegistDto.Response tourRegistDto = tourRegistService.tourRegist(request,
                userDetails.getUser());
        return new Response<>("200", "성공적으로 투어 등록 되었습니다!", tourRegistDto);
    }

    @GetMapping("/tour/{tourId}")
    public Response<TourDetailDto.Response> tourDetailApi(@PathVariable Long tourId) {
        TourDetailDto.Response response = tourGetService.tourDetail(tourId);
        return new Response<>("200", "성공적으로 투어 상세 정보를 가져 왔습니다!", response);
    }

    @PostMapping("/tour/reservation/{tourId}")
    public Response tourReservationApi(@PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        tourService.tourReservation(tourId, userDetails.getUser());
        return new Response("200", "성공적으로 투어를 예약 하였습니다!", null);
    }

    @PostMapping("/tour/wish/{tourId}")
    public Response tourWishApi(@PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IllegalAccessException {
        boolean isWished = tourService.tourWish(tourId, userDetails.getUser());

        if (isWished) {
            return new Response("200", "성공적으로 투어를 찜 하였습니다!", null);
        }
        return new Response("200", "성공적으로 찜 취소 하였습니다!", null);
    }

    @DeleteMapping("/tour/reservation/{tourId}")
    public Response tourReservationCancelApi(@PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        tourService.tourReservationCancel(tourId, userDetails.getUser());
        return new Response("200", "성공적으로 투어 예약을 취소 하였습니다!", null);
    }

    @DeleteMapping("/tour/wish/{tourId}")
    public Response tourCancelApi(@PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IllegalAccessException {
        tourService.tourCancel(tourId, userDetails.getUser());

        return new Response("200", "성공적으로 투어 성공적으로 취소 하였습니다!", null);
    }

    @DeleteMapping("/tour/end/{tourId}")
    public Response tourTerminateApi(@PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IllegalAccessException {
        tourService.tourTerminate(tourId, userDetails.getUser());
        return new Response("200", "성공적으로 투어를 종료 하였습니다!", null);
    }

    @GetMapping("/tour")
    public Response<TourListDto.Response> getALLTourApi(
            @PageableDefault(size = 6) Pageable pageable) {
        TourListDto.Response response = tourGetService.getALLTour(pageable);
        return new Response("200", "성공적으로 투어 목록을 불러왔습니다!", response);
    }

    @PutMapping("/tour/{tourId}")
    public Response<TourUpdateDto.Response> tourUpdateApi(
            @ModelAttribute TourUpdateDto.Request request, @PathVariable Long tourId,
            @AuthenticationPrincipal UserDetailsImpl userDetails)
            throws IllegalAccessException, IOException {
        TourUpdateDto.Response response = tourUpdateService.tourUpdate(request, tourId,
                userDetails.getUser());
        return new Response("200", "성공적으로 투어를 수정 하였습니다!", response);
    }

    @PostMapping("/tour/search")
    public Response<List<SearchTourDto>> searchTour(@PageableDefault(size = 18) Pageable pageable,
            @RequestBody TourSearchInfoDto.Request request) {
        List<SearchTourDto> searchTourDtos = tourSearchService.searchTour(request, pageable);
        return new Response<>("200", "성공적으로 투어를 찾았습니다.", searchTourDtos);
    }

    @PutMapping("/tour/link/{tourId}")
    public Response<TourLinkUpdateDto> tourLinkUpdateApi(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody TourLinkUpdateDto.Request request, @PathVariable Long tourId) {
        tourService.tourLinkUpdate(userDetails.getUser(), request, tourId);
        return new Response<>("200", "성공적으로 투어 링크를 등록했습니다.", null);
    }
}
