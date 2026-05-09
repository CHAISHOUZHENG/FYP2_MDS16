from __future__ import annotations

import argparse
import time
from pathlib import Path

import numpy as np
from PIL import Image

import app


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}


def iter_images(folder: Path):
    for path in sorted(folder.iterdir()):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            yield path


def validate_image(path: Path) -> tuple[bool, str, str]:
    try:
        image = np.array(Image.open(path).convert("RGB"))
    except Exception as exc:
        return False, "invalid_image", f"Invalid image file: {exc}"

    face, face_status, face_info = app.detect_face(image)

    if face_status == "no_face":
        lighting_result = app.validate_image_lighting(image)
        if not lighting_result["ok"]:
            return False, "quality", lighting_result["message"]
        return False, "no_face", app.NO_VALID_FACE_MESSAGE

    if face_status == "multiple_faces":
        return False, "multiple_faces", app.MULTIPLE_FACES_MESSAGE

    if face_status == "side_face":
        return False, "side_face", app.FACE_QUALITY_MESSAGE

    framing_result = app.validate_face_framing(face_info)
    if not framing_result["ok"]:
        return False, "framing", framing_result["message"]

    photo_result = app.validate_photo_likeness(face, face_info)
    if not photo_result["ok"]:
        return False, "not_real_face", photo_result["message"]

    quality_result = app.validate_face_quality(face)
    if not quality_result["ok"]:
        return False, "quality", quality_result["message"]

    feature_result = app.validate_detector_feature_visibility(face, face_info)
    if not feature_result["ok"]:
        return False, "blocked_features", feature_result["message"]

    return True, "pass", "Passed all face quality checks."


def test_folder(folder: Path, expected_pass: bool) -> tuple[int, int, list[Path]]:
    total = 0
    mismatches = 0
    mismatch_paths = []
    expected_label = "PASS" if expected_pass else "FAIL"

    print(f"\n[{expected_label} folder] {folder}")
    for image_path in iter_images(folder):
        total += 1
        start = time.perf_counter()
        actual_pass, reason, message = validate_image(image_path)
        elapsed_ms = (time.perf_counter() - start) * 1000
        actual_label = "PASS" if actual_pass else "FAIL"
        matched = actual_pass == expected_pass
        status_icon = "OK" if matched else "MISMATCH"

        if not matched:
            mismatches += 1
            mismatch_paths.append(image_path)

        print(
            f"{status_icon:8} expected={expected_label:4} actual={actual_label:4} "
            f"reason={reason:16} time={elapsed_ms:7.1f} ms | {image_path.name}"
        )
        if not actual_pass:
            print(f"         {message}")

    return total, mismatches, mismatch_paths


def print_summary(total: int, mismatches: int, mismatch_paths: list[Path]) -> None:
    matches = total - mismatches

    print("\nSummary")
    print(f"  Total images: {total}")
    print(f"  Matched expectation: {matches}")
    print(f"  Mismatches: {mismatches}")

    if mismatch_paths:
        print("  Mismatch paths:")
        for path in mismatch_paths:
            print(f"    {path}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Test face quality validation against pass/fail image folders."
    )
    parser.add_argument(
        "--dir",
        help="Single folder to test. Use with --expected pass or --expected fail.",
    )
    parser.add_argument(
        "--expected",
        choices=("pass", "fail"),
        help="Expected result for every image in --dir.",
    )
    parser.add_argument(
        "--pass-dir",
        default="/Users/aiyaya/Downloads/pass",
        help="Folder containing images expected to pass.",
    )
    parser.add_argument(
        "--fail-dir",
        default="/Users/aiyaya/Downloads/fail",
        help="Folder containing images expected to fail.",
    )
    args = parser.parse_args()

    if args.dir or args.expected:
        if not args.dir or not args.expected:
            raise SystemExit("Use --dir and --expected together.")

        folder = Path(args.dir).expanduser()
        if not folder.is_dir():
            raise SystemExit(f"Folder not found: {folder}")

        total, mismatches, mismatch_paths = test_folder(
            folder,
            expected_pass=args.expected == "pass"
        )
        print_summary(total, mismatches, mismatch_paths)

        return 1 if mismatches else 0

    pass_dir = Path(args.pass_dir).expanduser()
    fail_dir = Path(args.fail_dir).expanduser()

    if not pass_dir.is_dir():
        raise SystemExit(f"Pass folder not found: {pass_dir}")
    if not fail_dir.is_dir():
        raise SystemExit(f"Fail folder not found: {fail_dir}")

    pass_total, pass_mismatches, pass_mismatch_paths = test_folder(
        pass_dir,
        expected_pass=True
    )
    fail_total, fail_mismatches, fail_mismatch_paths = test_folder(
        fail_dir,
        expected_pass=False
    )

    total = pass_total + fail_total
    mismatches = pass_mismatches + fail_mismatches
    mismatch_paths = pass_mismatch_paths + fail_mismatch_paths
    print_summary(total, mismatches, mismatch_paths)

    return 1 if mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
