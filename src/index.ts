import { Chip, Line } from "node-libgpiod";
import async from "async";

/**
 * Represents a stepper motor controller for Raspberry Pi 5 using GPIO.
 */
export class StepperMotor {
  private chip: Chip;
  private pins: number[];
  private gpioLines: Line[];
  private stepSequence: number[][];
  private motorStepCounter: number;

  /**
   * Creates a new StepperMotor instance.
   * @param {Object} config - Configuration options for the stepper motor.
   * @param {string} [config.chipName="gpiochip4"] - The name of the GPIO chip.
   * @param {number[]} [config.pins=[17, 18, 27, 22]] - The GPIO pin numbers to use.
   * @param {number[][]} [config.stepSequence] - Custom step sequence for the motor.
   * @param {number} [config.initialStepCounter=0] - Initial step counter value.
   * @param {string} [config.consumerName="stepper"] - Consumer name for GPIO requests.
   */
  constructor(
    config: {
      chipName?: string;
      pins?: number[];
      stepSequence?: number[][];
      initialStepCounter?: number;
      consumerName?: string;
    } = {},
  ) {
    const {
      chipName = "gpiochip4",
      pins = [17, 18, 27, 22],
      stepSequence,
      initialStepCounter = 0,
      consumerName = "stepper",
    } = config;

    this.chip = new Chip(chipName);
    this.pins = pins;
    this.gpioLines = this.pins.map((pin) => new Line(this.chip, pin));

    this.stepSequence = stepSequence || [
      [1, 0, 0, 1],
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 1],
      [0, 0, 0, 1],
    ];
    this.motorStepCounter = initialStepCounter;

    this.setupPins(consumerName);
  }

  /**
   * Sets up the GPIO pins for output mode.
   * @private
   * @param {string} consumerName - Consumer name for GPIO requests.
   */
  private setupPins(consumerName: string): void {
    for (const line of this.gpioLines) {
      line.requestOutputMode(0, consumerName);
    }
  }

  /**
   * Cleans up the GPIO pins by setting them to low.
   */
  public cleanup(): void {
    for (const line of this.gpioLines) {
      line.setValue(0);
    }
  }

  /**
   * Moves the stepper motor.
   * @param {Object} config - Movement configuration.
   * @param {number} [config.stepCount=4096] - Number of steps to move.
   * @param {boolean} [config.direction=false] - Direction of movement (false: forward, true: backward).
   * @param {number} [config.stepSleep=2] - Delay between steps in milliseconds.
   * @returns {Promise<string>} A promise that resolves when the movement is complete.
   */
  public move(
    config: {
      stepCount?: number;
      direction?: boolean;
      stepSleep?: number;
    } = {},
  ): Promise<string> {
    const { stepCount = 4096, direction = false, stepSleep = 2 } = config;

    return new Promise((resolve, reject) => {
      async.eachSeries(
        Array.from({ length: stepCount }),
        (_, callback) => {
          async.waterfall(
            [
              (cb: any) => {
                async.each(
                  this.gpioLines.map((_, index) => index),
                  (pin: number, eachCallback: (err?: Error) => void) => {
                    this.gpioLines[pin].setValue(
                      this.stepSequence[this.motorStepCounter][pin] as 0 | 1,
                    );
                    eachCallback();
                  },
                  cb,
                );
              },
              (cb: any) => {
                this.motorStepCounter = direction
                  ? (this.motorStepCounter - 1 + 8) % 8
                  : (this.motorStepCounter + 1) % 8;
                setTimeout(cb, stepSleep);
              },
            ],
            callback,
          );
        },
        (err) => {
          this.cleanup();
          if (err) {
            reject(err);
          } else {
            resolve("Success");
          }
        },
      );
    });
  }

  /**
   * Releases the GPIO resources used by the stepper motor.
   * @returns {Promise<void>}
   */
  public delete(): Promise<void> {
    return new Promise((resolve, reject) => {
      async.each(
        this.gpioLines,
        (line: Line, callback) => {
          line.release();
          return callback(null);
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }
}
