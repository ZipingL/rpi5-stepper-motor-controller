A TypeScript package for controlling stepper motors on the Raspberry Pi 5 using GPIO.

## Introduction

The `rpi5-stepper-motor-controller` package provides a robust solution for controlling stepper motors on the Raspberry Pi 5. This package was developed to address the compatibility issues faced when using existing stepper motor libraries designed for Raspberry Pi 4 and earlier versions, which are not compatible with the Raspberry Pi 5's updated GPIO system.

This package offers a flexible and easy-to-use `StepperMotor` class that is compatible with any 4-pin stepper motor, making it versatile for various applications. Additionally, it includes a `BlindsController` class as an example implementation, demonstrating how to use the `StepperMotor` class for a specific use case.

## Background

After upgrading to the Raspberry Pi 5, I discovered that existing stepper motor scripts or libraries written for the Raspberry Pi 4 or earlier versions were not compatible with the new GPIO system. This package was developed to address this issue and provide a robust solution for controlling stepper motors on the Raspberry Pi 5. It has not yet been tested on the Raspberry Pi 4 or earlier versions, but it should work on those as well.

## Features

- Compatible with Raspberry Pi 5
- Supports any stepper motor driven by a chip driver that provides 4 pins
  - Such as the ULN2003 chip driver and its supported 28BYJ-48 stepper motor
  - The default pins are [17, 18, 27, 22], but you can specify your own pins, as well as other customizable options for configuring the pins on the raspberry pi
- Configurable step sequences
- Adjustable step delay and direction
- Promise-based API for easy integration with async/await
- Example implementation for controlling window blinds (further below in the README)

## Installation

Install the package using npm:

```bash
npm install rpi5-stepper-motor-controller
```

## Usage

### Basic StepperMotor Usage

```typescript
import { StepperMotor } from 'rpi5-stepper-motor-controller';

// Create a new StepperMotor instance
const motor = new StepperMotor({
  chipName: "gpiochip4",
  pins: [17, 18, 27, 22]
});

// Move the motor
async function moveMotor() {
  try {
    await motor.move({ stepCount: 2048, direction: false, stepSleep: 2 });
    console.log("Motor movement completed");
  } catch (error) {
    console.error("Error moving motor:", error);
  } finally {
    await motor.delete();
  }
}

moveMotor();
```

### Using the StepperMotor Class through a dedicated Controller

The `BlindsController` class demonstrates how to use the `StepperMotor` class for controlling window blinds. This encapsulation provides a modular and organized approach to managing motor operations for specific applications. This is especially useful given the nature of how the stepper motor is controlled (via literal turns) and the need to manage the motor's state, thus a dedicated controller class can help manage the motor's state and operations.
- Here, the `BlindsController` class is responsible for controlling the blinds using a stepper motor and provides a method `toggleBlinds` to open or close the blinds.
```typescript
import { StepperMotor } from 'rpi5-stepper-motor-controller';

/**
 * Controller for operating blinds using a stepper motor.
 */
class BlindsController {
    private motor: StepperMotor;

    /**
     * Creates a new BlindsController instance.
     * @param {StepperMotor} motor - The stepper motor to control the blinds.
     */
    constructor(motor: StepperMotor) {
        this.motor = motor;
    }

    /**
     * Toggles the blinds open or closed.
     * @param {boolean} [blindsState=false] - The desired state of the blinds (true: open, false: closed).
     * @returns {Promise<void>}
     */
    public async toggleBlinds(blindsState: boolean = false): Promise<void> {
        console.log("Blinds state:", blindsState ? "OPEN" : "CLOSED");
        for (let i = 0; i < 28; i++) {
            await this.motor.move({ stepCount: 1024, direction: !blindsState, stepSleep: 2 });
        }
    }
}

async function main() {
  const motor = new StepperMotor();
  const blinds = new BlindsController(motor);

  try {
    // Open the blinds
    await blinds.toggleBlinds(true);
    console.log("Blinds opened");

    // Wait for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Close the blinds
    await blinds.toggleBlinds(false);
    console.log("Blinds closed");
  } catch (error) {
    console.error("Error controlling blinds:", error);
  } finally {
    await motor.delete();
  }
}

main();
```

## API Reference

### StepperMotor

#### Constructor

```typescript
new StepperMotor(config: {
  chipName?: string;
  pins?: number[];
  stepSequence?: number[][];
  initialStepCounter?: number;
  consumerName?: string;
})
```

- `chipName`: The name of the GPIO chip (default: "gpiochip4")
- `pins`: Array of GPIO pin numbers (default: [17, 18, 27, 22])
- `stepSequence`: Custom step sequence for the motor
- `initialStepCounter`: Initial step counter value (default: 0)
- `consumerName`: Consumer name for GPIO requests (default: "stepper")

#### Methods

- `move(config: { stepCount?: number; direction?: boolean; stepSleep?: number; }): Promise<string>` - Moves the motor by the specified number of steps in the specified direction with the specified delay between steps.
  - `stepCount`: The number of steps to move the motor (default: 2048)
  - `direction`: The direction to move the motor (true: clockwise, false: counterclockwise) (default: true)
  - `stepSleep`: The delay between steps in milliseconds (default: 2)
  - Returns a Promise that resolves to a string indicating the completion of the motor movement.
  - Will throw an error if the motor is already moving, or if the resource is busy, or for any other reason in which the gpio pins cannot be actively controlled.
- `cleanup(): void` - Sets the values of all the pins to 0. This ensures that the pins are not left in an active state when the motor is not in use, which can cause the motor to heat up and potentially damage it. Note that with stepper motors, the motor moves only when the pins are undergoing changes in values. Therefore, if a pin remains on after movement is complete, the motor will not move but will still be powered, leading to potential overheating or unnecessary power consumption.
- `delete(): Promise<void>` - Releases the GPIO pins and cleans up the resources used by the motor.
  -  Note: If you do not release these pins and attempt to create another instance of the `StepperMotor` class using one or more of the same pins, you will receive a `Resource busy` error. *You can either take advantage of this by having your application exclusively control the motor (preventing other applications from using it) by not releasing the pins until the application exits, or you can release the pins each time the application finishes using the motor to allow other applications to use the pins.*


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
