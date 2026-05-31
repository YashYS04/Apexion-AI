from typing import List, Dict, Any

class F1StrategySimulator:
    """
    Simulates tyre wear, fuel usage, lap times, pit stops, and race positions.
    Combines compound coefficients, track temperature, and vehicle weight.
    """
    # Track configurations
    TRACKS = {
      "Silverstone Circuit": {
          "base_laptime": 88.0,
          "pit_loss": 20.5,
          "fuel_burn_rate": 1.6, # kg per lap
          "fuel_penalty_factor": 0.03, # seconds per kg of fuel
          "laps": 52
      },
      "Circuit de Monaco": {
          "base_laptime": 74.0,
          "pit_loss": 25.0,
          "fuel_burn_rate": 1.3,
          "fuel_penalty_factor": 0.025,
          "laps": 64
      }
    }

    # Tyre compound specs
    TYRE_SPECS = {
        "Soft": {
            "pace_offset": -0.8,      # Fast but degrades quickly
            "life_expectancy": 15.0,  # Max laps before high deg
            "wear_exponent": 1.6,     # Deg acceleration
            "wear_penalty": 0.15,     # Time penalty (s) per % wear above 40%
            "base_wear_per_lap": 4.5  # % wear per lap
        },
        "Medium": {
            "pace_offset": 0.0,       # Baseline
            "life_expectancy": 26.0,
            "wear_exponent": 1.3,
            "wear_penalty": 0.09,
            "base_wear_per_lap": 2.6
        },
        "Hard": {
            "pace_offset": 0.8,       # Slower but durable
            "life_expectancy": 42.0,
            "wear_exponent": 1.1,
            "wear_penalty": 0.05,
            "base_wear_per_lap": 1.5
        },
        "Intermediate": {
            "pace_offset": 5.0,       # For damp tracks
            "life_expectancy": 25.0,
            "wear_exponent": 1.4,
            "wear_penalty": 0.12,
            "base_wear_per_lap": 3.0
        },
        "Wet": {
            "pace_offset": 10.0,      # Heavy water clearance
            "life_expectancy": 30.0,
            "wear_exponent": 1.3,
            "wear_penalty": 0.10,
            "base_wear_per_lap": 2.5
        }
    }

    @classmethod
    def run_simulation(
        cls, 
        track_name: str, 
        start_tyre: str, 
        pit_stops: List[Dict[str, Any]], 
        track_temp: float = 38.0,
        weather: str = "Sunny"
    ) -> Dict[str, Any]:
        """
        Runs a lap-by-lap strategy simulation.
        pit_stops: list of dicts: [{"lap": 20, "next_tyre": "Hard"}, ...]
        """
        track = cls.TRACKS.get(track_name, cls.TRACKS["Silverstone Circuit"])
        total_laps = track["laps"]
        base_laptime = track["base_laptime"]
        pit_loss = track["pit_loss"]
        fuel_burn = track["fuel_burn_rate"]
        fuel_penalty = track["fuel_penalty_factor"]

        # Sort pit stops by lap
        pit_stops_sorted = sorted(pit_stops, key=lambda x: x["lap"])
        pit_map = {stop["lap"]: stop["next_tyre"] for stop in pit_stops_sorted}

        # Initialize simulation state
        current_tyre = start_tyre
        tyre_age = 0
        tyre_wear = 0.0
        fuel_load = fuel_burn * total_laps  # Start with exact fuel needed
        total_time = 0.0
        
        laps_data = []

        # Temperature coefficient: optimal tire temp window is centered around 30°C.
        # Wear rate increases or decreases depending on the deviation.
        temp_modifier = 1.0 + (track_temp - 30.0) * 0.015
        temp_modifier = max(0.6, min(1.8, temp_modifier))

        is_wet_weather = weather in ["Rain", "Storm"]
        slick_warning_triggered = False
        wet_on_dry_warning_triggered = False

        for lap in range(1, total_laps + 1):
            spec = cls.TYRE_SPECS.get(current_tyre, cls.TYRE_SPECS["Medium"])
            
            # Check if driver pits at the END of the previous lap / START of this lap
            is_pit_lap = False
            pit_time_loss = 0.0
            if lap in pit_map:
                is_pit_lap = True
                pit_time_loss = pit_loss
                # Swap tyre
                current_tyre = pit_map[lap]
                tyre_age = 0
                tyre_wear = 0.0
                spec = cls.TYRE_SPECS.get(current_tyre, cls.TYRE_SPECS["Medium"])

            # 1. Base tyres offset
            tyre_offset = spec["pace_offset"]

            # Weather modifiers:
            # If weather is wet, slick tyres lose traction (slower pace) and wear out extremely fast (sliding).
            # Intermediate/Wet tyres perform optimally in wet weather, but degrade fast on dry tracks.
            wear_modifier = 1.0
            traction_loss = 0.0
            
            is_slick = current_tyre in ["Soft", "Medium", "Hard"]
            
            if is_wet_weather:
                if is_slick:
                    # Slicks on wet track: heavy sliding
                    wear_modifier = 3.5 if weather == "Rain" else 5.0
                    traction_loss = 4.5 if weather == "Rain" else 7.5
                    slick_warning_triggered = True
                else:
                    # Intermediate/Wet tyres are in their element!
                    # Reduce their pace offset since they clear water and gain grip compared to standard slick baseline
                    tyre_offset -= 3.0 if current_tyre == "Intermediate" else 5.0
            else:
                # Dry weather
                if not is_slick:
                    # Wet/Inter tyres on dry track: overheat and wear out rapidly
                    wear_modifier = 3.0
                    traction_loss = 2.0
                    wet_on_dry_warning_triggered = True

            # 2. Tyre Wear calculation (non-linear)
            tyre_age += 1
            wear_rate = spec["base_wear_per_lap"] * temp_modifier * wear_modifier
            tyre_wear = min(100.0, tyre_age * wear_rate)
            
            # Wear penalty applies if wear is over 35%
            deg_effect = 0.0
            if tyre_wear > 35.0:
                deg_effect = ((tyre_wear - 35.0) ** spec["wear_exponent"]) * spec["wear_penalty"] / 10.0

            # 3. Fuel weight penalty
            fuel_effect = fuel_load * fuel_penalty
            
            # 4. Direct thermal degradation/heating penalty
            # Optimal operating window is 25°C to 35°C
            thermal_penalty = 0.0
            if track_temp > 35.0:
                thermal_penalty = (track_temp - 35.0) * 0.04
            elif track_temp < 25.0:
                thermal_penalty = (25.0 - track_temp) * 0.05

            # Compute final laptime
            lap_time = base_laptime + tyre_offset + deg_effect + fuel_effect + pit_time_loss + thermal_penalty + traction_loss
            
            # Update state
            total_time += lap_time
            fuel_load = max(0.0, fuel_load - fuel_burn)

            # Estimate tyre temperature
            # Simple thermodynamics: temp rises with speed & cornering, stabilizes, rises if wear is high
            base_temp = 90.0 if current_tyre in ["Intermediate", "Wet"] else 100.0
            tyre_temp = base_temp + (tyre_wear * 0.25) + (temp_modifier * 2.0)
            if is_wet_weather and is_slick:
                tyre_temp -= 15.0 # Wet track cools slick tyres down but they slide
            elif not is_wet_weather and not is_slick:
                tyre_temp += 25.0 # Wet tyres on dry track overheat severely

            laps_data.append({
                "lap": lap,
                "tyre": current_tyre,
                "tyre_age": tyre_age,
                "tyre_wear": round(tyre_wear, 1),
                "tyre_temp": round(tyre_temp, 1),
                "fuel_left": round(fuel_load, 1),
                "lap_time": round(lap_time, 2),
                "cumulative_time": round(total_time, 2),
                "is_pit_lap": is_pit_lap
            })

        # Calculate comparative analysis (e.g. against an optimal 1-stop)
        # For simplicity, let's create a standard baseline 1-stop Medium->Hard on Silverstone
        baseline_time = 0.0
        if track_name == "Circuit de Monaco":
            baseline_time = 5020.0 # Monaco baseline total seconds
        else:
            baseline_time = 4780.0 # Silverstone baseline total seconds

        # Add weather effects to baseline time if baseline didn't account for rain
        if is_wet_weather:
            # Baseline assumes slicks, so baseline time is severely affected by rain
            baseline_time += (total_laps * 5.0)

        time_delta = total_time - baseline_time
        # Position delta: 1 position gained per 3 seconds faster, 1 lost per 3 seconds slower
        pos_delta = int(-time_delta / 3.2)
        
        # Limit positions
        if pos_delta > 5:
            pos_delta = 5
        elif pos_delta < -8:
            pos_delta = -8

        # Generate explainable AI reasoning notes
        insights = []
        if len(pit_stops) == 0:
            insights.append("CRITICAL: Zero pit stops planned. This violates FIA Sporting Regulations Article 24.2 (mandatory 2 compound usage) and will result in disqualification.")
        
        if max(x["tyre_wear"] for x in laps_data) > 85.0:
            insights.append("WARNING: Tyre wear exceeds 85% during parts of the race. High probability of structural failure or puncture. Pitting earlier is advised.")

        if len(pit_stops) > 2:
            insights.append("STRATEGY: 3+ stop strategy incurs high pit lane time penalties. The pace gain on fresh tyres does not offset the total pit lane transit loss.")

        if track_temp > 45.0:
            insights.append(f"THERMAL DYNAMICS: High track temperature of {track_temp}°C causes tyre overheating, accelerating wear rates and adding thermal pace penalties.")
        elif track_temp < 20.0:
            insights.append(f"THERMAL DYNAMICS: Low track temperature of {track_temp}°C struggles to heat the tyres into their optimal operating window, causing grip loss.")

        if start_tyre == "Soft" and len(pit_stops) == 0:
            insights.append("CRITICAL: Starting on Soft tyres with no pit stops is extremely high risk. Soft tyres will degrade completely before mid-race, severely compromising vehicle handling.")

        if slick_warning_triggered:
            insights.append(f"CRITICAL WEATHER ALERT: Wet track conditions ({weather}) detected while running slick tyres (Soft/Medium/Hard). Massive traction loss (+4.5s+ lap penalty) and dangerous sliding wear rates. BOX BOX BOX for Intermediates or Wets immediately.")
        
        if wet_on_dry_warning_triggered:
            insights.append("WARNING WEATHER ALERT: Running Intermediate or Wet tyres on a dry track. The tyres will blister and degrade rapidly (3.0x wear rate penalty). Pit for slick tyres (Soft, Medium, or Hard) to optimize pace.")

        if time_delta < 0:
            insights.append(f"OPTIMIZATION: This strategy is {abs(time_delta):.1f}s faster than the baseline wet/dry race simulation, yielding a projected grid gain of +{pos_delta} positions.")
        else:
            insights.append(f"OPTIMIZATION: This strategy is {time_delta:.1f}s slower than the baseline. Re-evaluate tire compounds or change pit lap to avoid traffic.")

        return {
            "track": track_name,
            "total_time": round(total_time, 2),
            "time_delta_vs_actual": round(time_delta, 2),
            "projected_position_change": pos_delta,
            "laps": laps_data,
            "ai_insights": insights,
            "assumptions": [
                f"Track temperature constant at {track_temp}°C",
                f"Weather conditions: {weather}",
                f"Average pit stop service time of 2.8 seconds"
            ]
        }
