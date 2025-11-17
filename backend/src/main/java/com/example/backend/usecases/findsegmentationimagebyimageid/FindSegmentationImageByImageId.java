package com.example.backend.usecases.findsegmentationimagebyimageid;

import com.example.backend.entities.Segmented_Image;
import com.example.backend.interfaces.ISegmentationImageService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@AllArgsConstructor
public class FindSegmentationImageByImageId {
    private ISegmentationImageService segmentationImageService;

    public Optional<Segmented_Image> execute(Long imageId) {
        return segmentationImageService.findSegmentationImageByImageId(imageId);
    }
}
