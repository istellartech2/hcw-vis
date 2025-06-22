# CSV Playback Format Specification

This document describes the CSV file format for 6DOF (6 Degrees of Freedom) satellite trajectory playback in the HCW visualization system.

## Overview

The CSV playback feature allows users to visualize pre-computed satellite trajectories that include both position and attitude data. Each satellite's state is defined by its position in the RSW coordinate frame and its attitude as a quaternion representing the rotation from the satellite body frame to the RSW frame.

## Coordinate System

- **RSW Frame**: Radial-Along-track-Cross-track coordinate system
  - **R (Radial)**: Points from Earth's center towards the reference satellite
  - **S (Along-track)**: Points in the direction of orbital motion
  - **W (Cross-track)**: Completes the right-handed coordinate system (normal to the orbital plane)

## CSV File Format

### Header Row
The first row must contain column headers that describe the data structure:

```
Time (s),Sat1_X (m),Sat1_Y (m),Sat1_Z (m),Sat1_Qw,Sat1_Qx,Sat1_Qy,Sat1_Qz,Sat2_X (m),Sat2_Y (m),Sat2_Z (m),Sat2_Qw,Sat2_Qx,Sat2_Qy,Sat2_Qz,...
```

### Column Structure

1. **Time Column**: 
   - Column 1: `Time (s)` - Simulation time in seconds from start
   - Type: Floating-point number
   - Units: Seconds
   - Must be monotonically increasing

2. **Satellite Data** (7 columns per satellite):
   - **Position (3 columns)**:
     - `SatN_X (m)`: X position in RSW frame (Radial direction)
     - `SatN_Y (m)`: Y position in RSW frame (Along-track direction) 
     - `SatN_Z (m)`: Z position in RSW frame (Cross-track direction)
     - Type: Floating-point number
     - Units: Meters
   
   - **Quaternion (4 columns)**:
     - `SatN_Qw`: Quaternion W component (scalar part)
     - `SatN_Qx`: Quaternion X component 
     - `SatN_Qy`: Quaternion Y component
     - `SatN_Qz`: Quaternion Z component
     - Type: Floating-point number
     - Units: Dimensionless
     - Represents rotation from satellite body frame to RSW frame
     - Must be normalized (|q| = 1)

### Multiple Satellites

For multiple satellites, simply add additional column groups. Each satellite requires 7 columns (3 position + 4 quaternion). The pattern repeats for as many satellites as needed:

```
Time (s),Sat1_X (m),Sat1_Y (m),Sat1_Z (m),Sat1_Qw,Sat1_Qx,Sat1_Qy,Sat1_Qz,Sat2_X (m),Sat2_Y (m),Sat2_Z (m),Sat2_Qw,Sat2_Qx,Sat2_Qy,Sat2_Qz,Sat3_X (m),Sat3_Y (m),Sat3_Z (m),Sat3_Qw,Sat3_Qx,Sat3_Qy,Sat3_Qz,...
```

## Format Requirements

### Data Validation
- All rows must have the same number of columns
- Time values must be strictly increasing
- Quaternions should be normalized (within tolerance)
- No missing values allowed
- Number of data columns must be: `1 + (7 × number_of_satellites)`

### File Requirements
- File extension: `.csv`
- Character encoding: UTF-8
- Line endings: Any standard format (LF, CRLF)
- Decimal separator: Period (`.`)
- Field separator: Comma (`,`)
- No quotes around numeric values

### Recommended Practices
- Time steps should be reasonably uniform for smooth playback
- Typical time step: 0.1 to 5.0 seconds
- Position accuracy: Millimeter precision is usually sufficient
- Quaternion precision: At least 6 decimal places recommended

## Sample Files

### Single Satellite Example
```csv
Time (s),Sat1_X (m),Sat1_Y (m),Sat1_Z (m),Sat1_Qw,Sat1_Qx,Sat1_Qy,Sat1_Qz
0.0,10.0,0.0,0.0,1.0,0.0,0.0,0.0
5.0,9.51,3.09,0.0,0.996,0.087,0.0,0.0
10.0,8.09,5.88,0.0,0.985,0.174,0.0,0.0
```

### Multiple Satellites Example
```csv
Time (s),Sat1_X (m),Sat1_Y (m),Sat1_Z (m),Sat1_Qw,Sat1_Qx,Sat1_Qy,Sat1_Qz,Sat2_X (m),Sat2_Y (m),Sat2_Z (m),Sat2_Qw,Sat2_Qx,Sat2_Qy,Sat2_Qz
0.0,5.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,5.0,0.0,0.866,0.0,0.0,0.5
5.0,4.76,1.55,0.0,0.996,0.087,0.0,0.0,-1.55,4.76,0.0,0.819,0.0,0.0,0.574
```

## Sample Files Location

Pre-made sample files are available in the `/public/samples/` directory:
- `single_satellite_6dof.csv`: Demonstrates single satellite trajectory
- `three_satellite_6dof.csv`: Demonstrates formation flight with 3 satellites

## Usage in Application

1. Navigate to the CSV Playback mode in the sidebar
2. Click "Load CSV File" and select your formatted CSV file
3. The system will validate the format and display any errors
4. If valid, use the playback controls to visualize the trajectory
5. Time scaling and interpolation are handled automatically

## Quaternion Convention

The quaternion represents the rotation from the satellite body frame to the RSW frame:

```
q = [qw, qx, qy, qz]
```

Where:
- `qw` is the scalar (real) part
- `[qx, qy, qz]` is the vector (imaginary) part
- The quaternion is in the form: `q = qw + qx*i + qy*j + qz*k`
- Normalization: `qw² + qx² + qy² + qz² = 1`

## Common Issues and Troubleshooting

### Validation Errors
- **"Inconsistent number of columns"**: Ensure all rows have the same number of fields
- **"Time values not increasing"**: Check that time column is monotonically increasing
- **"Invalid quaternion norm"**: Verify quaternions are normalized
- **"Missing header row"**: First row must contain column descriptions

### Performance Considerations
- Large files (>100MB) may take time to load
- Recommended maximum: 10,000 time steps for smooth playback
- For very long trajectories, consider resampling to reduce file size

## Technical Implementation Notes

The CSV parser uses the following algorithms:
- **Interpolation**: Linear interpolation for position, SLERP for quaternions
- **Time synchronization**: Playback time is mapped to CSV time range
- **Memory management**: Large datasets are processed in chunks
- **Validation**: Real-time validation during file parsing