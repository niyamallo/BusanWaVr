package com.example.backend.dto.userinfo;

import com.example.backend.dto.review.ReviewUserInfoDto;
import com.example.backend.model.enums.AuthType;
import com.example.backend.model.review.Review;
import com.example.backend.model.user.User;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class UserInfoDto {

    @Data
    @NoArgsConstructor
    public static class Response {

        private Long userId;
        private String email;
        private String nickname;
        private List<String> categories;
        private String profileImg;
        private AuthType type;
        private String introduction;
        private int followingNum;
        private List<ReviewUserInfoDto> reviews;

        public Response(User user, List<String> categories, int followingNum, List<ReviewUserInfoDto> reviews) {
            this.userId = user.getId();
            this.email = user.getEmail();
            this.nickname = user.getNickname();
            this.categories = categories;
            this.profileImg = user.getProfileImg();
            this.type = user.getType();
            this.introduction = user.getIntroduction();
            this.followingNum = followingNum;
            this.reviews = reviews;
        }
    }
}
